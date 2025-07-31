// Estado global de la aplicación
let state = {
    ventas: [],
    ordenes: [],
    gastos: [],
    montoInicial: {},
    clientes: [],
    facturas: [],
    configuracionesRNC: [],
    activeTab: 'ventas',
    filtroEstado: 'todos',
    ws: null,
    ventaActual: 0,
    historialVisible: false,
    fechaSeleccionada: new Date().toISOString().split('T')[0] // Fecha actual por defecto
};

// Configuración
const API_BASE = window.location.origin + '/api';
const WS_URL = `ws://${window.location.hostname}:3007`;

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
    await initApp();
});

async function initApp() {
    // Registrar service worker
    if ('serviceWorker' in navigator) {
        try {
            await navigator.serviceWorker.register('/sw.js');
            console.log('Service Worker registrado');
        } catch (error) {
            console.error('Error registrando Service Worker:', error);
        }
    }

    // Configurar fecha actual
    updateCurrentDate();

    // Configurar event listeners
    setupEventListeners();

    // Cargar datos iniciales
    await loadInitialData();

    // Conectar WebSocket
    connectWebSocket();

    // Actualizar vista inicial
    updateAllViews();
}

function updateCurrentDate() {
    const fechaElement = document.getElementById('fecha-actual');
    const fechaSelector = document.getElementById('fecha-selector');
    
    // Actualizar el selector de fecha
    fechaSelector.value = state.fechaSeleccionada;
    
    // Crear objeto de fecha para mostrar
    const fecha = new Date(state.fechaSeleccionada + 'T00:00:00');
    const fechaFormateada = fecha.toLocaleDateString('es-CO', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    // Marcar si es hoy, ayer, etc.
    const hoy = new Date().toISOString().split('T')[0];
    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 1);
    const ayerStr = ayer.toISOString().split('T')[0];
    
    let etiqueta = '';
    if (state.fechaSeleccionada === hoy) {
        etiqueta = ' (HOY)';
    } else if (state.fechaSeleccionada === ayerStr) {
        etiqueta = ' (AYER)';
    } else if (state.fechaSeleccionada > hoy) {
        etiqueta = ' (FUTURO)';
    }
    
    fechaElement.textContent = fechaFormateada + etiqueta;
}

// Funciones de navegación de fecha
function cambiarFecha(dias) {
    const fechaActual = new Date(state.fechaSeleccionada + 'T00:00:00');
    fechaActual.setDate(fechaActual.getDate() + dias);
    state.fechaSeleccionada = fechaActual.toISOString().split('T')[0];
    
    updateCurrentDate();
    cargarDatosFecha();
}

function cambiarFechaSeleccionada() {
    const fechaSelector = document.getElementById('fecha-selector');
    state.fechaSeleccionada = fechaSelector.value;
    
    updateCurrentDate();
    cargarDatosFecha();
}

function irAHoy() {
    state.fechaSeleccionada = new Date().toISOString().split('T')[0];
    updateCurrentDate();
    cargarDatosFecha();
}

// Cargar datos para la fecha seleccionada
async function cargarDatosFecha() {
    showLoading(true);
    try {
        const [ventasRes, ordenesRes, gastosRes] = await Promise.all([
            fetch(`${API_BASE}/ventas?fecha=${state.fechaSeleccionada}`),
            fetch(`${API_BASE}/ordenes?fecha=${state.fechaSeleccionada}`),
            fetch(`${API_BASE}/gastos?fecha=${state.fechaSeleccionada}`)
        ]);

        state.ventas = await ventasRes.json();
        state.ordenes = await ordenesRes.json();
        state.gastos = await gastosRes.json();

        // Cargar monto inicial para la fecha seleccionada
        const montoRes = await fetch(`${API_BASE}/monto-inicial/${state.fechaSeleccionada}`);
        const montoData = await montoRes.json();
        state.montoInicial[state.fechaSeleccionada] = montoData.monto;

        // Actualizar todas las vistas
        updateAllViews();
    } catch (error) {
        console.error('Error cargando datos para la fecha:', error);
    } finally {
        showLoading(false);
    }
}

function setupEventListeners() {
    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tab = e.currentTarget.dataset.tab;
            switchTab(tab);
        });
    });

    // Filtros
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const filter = e.currentTarget.dataset.filter;
            setFilter(filter);
        });
    });

    // Modal overlay
    document.getElementById('modal').addEventListener('click', (e) => {
        if (e.target.id === 'modal') {
            closeModal();
        }
    });
}

async function loadInitialData() {
    // Cargar datos para la fecha seleccionada (hoy por defecto)
    await cargarDatosFecha();
    
    // Cargar clientes y configuraciones
    await cargarClientes();
    await cargarConfiguracionesRNC();
    
    // Cargar créditos
    await loadCreditos();
}

function connectWebSocket() {
    try {
        state.ws = new WebSocket(WS_URL);
        
        state.ws.onopen = () => {
            console.log('WebSocket conectado');
        };

        state.ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            handleWebSocketMessage(message);
        };

        state.ws.onclose = () => {
            console.log('WebSocket desconectado, intentando reconectar...');
            setTimeout(connectWebSocket, 3000);
        };

        state.ws.onerror = (error) => {
            console.error('Error WebSocket:', error);
        };
    } catch (error) {
        console.error('Error conectando WebSocket:', error);
    }
}

function handleWebSocketMessage(message) {
    switch (message.type) {
        case 'nueva_venta':
            state.ventas.unshift(message.data);
            updateVentasView();
            updateCajaView();
            break;
        case 'venta_anulada':
            const venta = state.ventas.find(v => v.id === message.data.id);
            if (venta) venta.anulada = 1;
            updateVentasView();
            updateCajaView();
            break;
        case 'nueva_orden':
            state.ordenes.unshift(message.data);
            updateOrdenesView();
            updateCajaView();
            break;
        case 'orden_actualizada':
            const orden = state.ordenes.find(o => o.id === message.data.id);
            if (orden) {
                Object.assign(orden, message.data);
            }
            updateOrdenesView();
            updateCajaView();
            break;
        case 'orden_anulada':
            const ordenAnular = state.ordenes.find(o => o.id === message.data.id);
            if (ordenAnular) ordenAnular.anulada = 1;
            updateOrdenesView();
            updateCajaView();
            break;
        case 'nuevo_gasto':
            state.gastos.unshift(message.data);
            updateCajaView();
            break;
        case 'monto_inicial_actualizado':
            state.montoInicial[message.data.fecha] = message.data.monto;
            updateCajaView();
            break;
        case 'nuevo_conduce':
            state.conduces.unshift(message.data);
            updateCreditosSummary(state.conduces);
            renderConducesList(state.conduces);
            updateClientFilters(state.clientes);
            break;
    }
}

// Navegación y UI
function switchTab(tabName) {
    // Actualizar botones
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    // Actualizar contenido
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `${tabName}-tab`);
    });

    state.activeTab = tabName;

    // Actualizar vista específica
    switch (tabName) {
        case 'ventas':
            updateVentasView();
            break;
        case 'ordenes':
            updateOrdenesView();
            break;
        case 'clientes':
            updateClientesView();
            break;
        case 'facturas':
            cargarFacturas();
            break;
        case 'creditos':
            loadCreditos();
            break;
        case 'caja':
            updateCajaView();
            break;
    }
}

function setFilter(filter) {
    // Actualizar botones de filtro
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
    });

    state.filtroEstado = filter;

    // Mostrar/ocultar info de filtro
    const filterInfo = document.getElementById('filter-info');
    if (filter === 'todos') {
        filterInfo.classList.add('hidden');
    } else {
        filterInfo.classList.remove('hidden');
        filterInfo.innerHTML = `
            📍 Mostrando solo: <strong>${filter.toUpperCase().replace('-', ' ')}</strong>
            <button onclick="setFilter('todos')">Ver todos</button>
        `;
    }

    updateOrdenesView();
}

// Modales
function openModal(type) {
    const modal = document.getElementById('modal');
    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');

    switch (type) {
        case 'venta':
            title.textContent = 'Nueva Venta';
            body.innerHTML = getVentaModalContent();
            break;
        case 'orden':
            title.textContent = 'Nueva Orden de Delivery';
            body.innerHTML = getOrdenModalContent();
            break;
        case 'gasto':
            title.textContent = 'Nuevo Gasto';
            body.innerHTML = getGastoModalContent();
            break;
        case 'montoInicial':
            title.textContent = 'Establecer Monto Inicial de Caja';
            body.innerHTML = getMontoInicialModalContent();
            break;
        case 'cliente':
            title.textContent = 'Nuevo Cliente';
            body.innerHTML = getTemplateContent('template-cliente-modal');
            break;
        case 'factura':
            title.textContent = 'Nueva Factura';
            body.innerHTML = getTemplateContent('template-factura-modal');
            setTimeout(() => setupFacturaModal(), 100);
            break;
        case 'configuracion-rnc':
            title.textContent = 'Configuración RNC';
            body.innerHTML = getTemplateContent('template-configuracion-rnc-modal');
            setTimeout(() => updateConfiguracionesRNCView(), 100);
            break;
        case 'reporte-rnc':
            title.textContent = 'Generar Reporte RNC';
            body.innerHTML = getTemplateContent('template-reporte-rnc-modal');
            break;
        case 'conduce':
            title.textContent = 'Nuevo Conduce a Crédito';
            body.innerHTML = getTemplateContent('template-conduce-modal');
            setTimeout(() => {
                console.log('Configurando modal de conduce...');
                setupConduceModal();
            }, 100);
            break;
        case 'pagar-creditos':
            title.textContent = 'Pagar Créditos';
            body.innerHTML = getTemplateContent('template-pagar-creditos-modal');
            // Forzar rebinding inmediato del evento y feedback
            setTimeout(() => {
                setupPagarCreditosModal();
                // Forzar feedback visual y habilitar botón
                const btn = document.getElementById('btn-pagar-creditos');
                if (btn) btn.disabled = true;
                const form = document.getElementById('pagar-creditos-form');
                if (form) {
                    form.onsubmit = pagarCreditos;
                }
            }, 50);
            break;
    }

    modal.classList.remove('hidden');
}

function getTemplateContent(templateId) {
    const template = document.getElementById(templateId);
    return template ? template.innerHTML : '';
}

function setupFacturaModal() {
    // Cargar clientes en el select
    const clienteSelect = document.getElementById('factura-cliente');
    if (clienteSelect) {
        clienteSelect.innerHTML = '<option value="">Seleccionar cliente...</option>' +
            state.clientes.map(cliente => 
                `<option value="${cliente._id}">${cliente.nombre} - ${cliente.telefono}</option>`
            ).join('');
    }
    
    // Configurar eventos de cálculo en el primer producto
    const primerProducto = document.querySelector('.producto-item');
    if (primerProducto) {
        setupProductoCalculation(primerProducto);
    }
}

function closeModal() {
    document.getElementById('modal').classList.add('hidden');
}

function getVentaModalContent() {
    return `
        <div class="form-group">
            <label>Monto de la Venta</label>
            <input type="number" id="venta-monto" min="0" step="100" placeholder="Valor total de la venta">
        </div>
        <div class="form-group">
            <label>Método de Pago</label>
            <select id="venta-metodo">
                <option value="efectivo">Efectivo</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="transferencia">Transferencia</option>
            </select>
        </div>
        <div class="form-summary">
            <div class="form-summary-total">
                <span>Total:</span>
                <span id="venta-total">$0</span>
            </div>
        </div>
        <button class="btn-submit" onclick="submitVenta()">Registrar Venta</button>
    `;
}

function getOrdenModalContent() {
    return `
        <div class="form-group">
            <label>Cliente</label>
            <input type="text" id="orden-cliente" placeholder="Nombre del cliente">
        </div>
        <div class="form-group">
            <label>Teléfono</label>
            <input type="tel" id="orden-telefono" placeholder="Número de teléfono">
        </div>
        <div class="form-group">
            <label>Dirección</label>
            <input type="text" id="orden-direccion" placeholder="Dirección de entrega">
        </div>
        <div class="form-group">
            <label>Descripción del Pedido</label>
            <textarea id="orden-descripcion" placeholder="Ej: 2 platos del día, 1 gaseosa, 1 jugo..."></textarea>
        </div>
        <div class="form-group">
            <label>Monto del Pedido</label>
            <input type="number" id="orden-monto" min="0" step="100" placeholder="Valor del pedido (sin delivery)">
        </div>
        <div class="form-group">
            <label>Costo de Delivery</label>
            <input type="number" id="orden-delivery" min="0" step="50" value="100" placeholder="Costo del envío">
        </div>
        <div class="form-group">
            <label>Método de Pago</label>
            <select id="orden-metodo">
                <option value="efectivo">Efectivo</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="transferencia">Transferencia</option>
            </select>
        </div>
        <div class="form-group">
            <label>Repartidor</label>
            <select id="orden-repartidor">
                <option value="propio">Propio</option>
                <option value="tercero">Tercero</option>
            </select>
        </div>
        <div class="form-summary">
            <div class="form-summary-row">
                <span>Pedido:</span>
                <span id="orden-monto-display">$0</span>
            </div>
            <div class="form-summary-row">
                <span>Delivery:</span>
                <span id="orden-delivery-display">$100</span>
            </div>
            <hr>
            <div class="form-summary-total">
                <span>Total:</span>
                <span id="orden-total">$100</span>
            </div>
        </div>
        <button class="btn-submit primary" onclick="submitOrden()">Registrar Orden</button>
    `;
}

function getGastoModalContent() {
    return `
        <div class="form-group">
            <label>Concepto del Gasto</label>
            <input type="text" id="gasto-concepto" placeholder="Ej: Ingredientes, servicios, etc.">
        </div>
        <div class="form-group">
            <label>Monto</label>
            <input type="number" id="gasto-monto" min="0" placeholder="Valor del gasto">
        </div>
        <button class="btn-submit danger" onclick="submitGasto()">Registrar Gasto</button>
    `;
}

function getMontoInicialModalContent() {
    return `
        <div class="info-box">
            💡 Establece el monto de efectivo con el que abres la caja al inicio del día.
            Esto te ayudará a hacer el cuadre correcto al cierre.
        </div>
        <div class="form-group">
            <label>Monto Inicial de Caja</label>
            <input type="number" id="monto-inicial" min="0" step="1000" placeholder="¿Con cuánto efectivo abres la caja?">
        </div>
        <div class="form-summary">
            <div class="form-summary-total">
                <span>Monto:</span>
                <span id="monto-inicial-display">$0</span>
            </div>
        </div>
        <button class="btn-submit primary" onclick="submitMontoInicial()">Establecer Monto Inicial</button>
    `;
}

// Actualizaciones en tiempo real de los formularios
document.addEventListener('input', (e) => {
    if (e.target.id === 'venta-monto') {
        const total = parseFloat(e.target.value) || 0;
        document.getElementById('venta-total').textContent = formatCurrency(total);
    }
    
    if (e.target.id === 'orden-monto' || e.target.id === 'orden-delivery') {
        const monto = parseFloat(document.getElementById('orden-monto')?.value) || 0;
        const delivery = parseFloat(document.getElementById('orden-delivery')?.value) || 0;
        const total = monto + delivery;
        
        if (document.getElementById('orden-monto-display')) {
            document.getElementById('orden-monto-display').textContent = formatCurrency(monto);
        }
        if (document.getElementById('orden-delivery-display')) {
            document.getElementById('orden-delivery-display').textContent = formatCurrency(delivery);
        }
        if (document.getElementById('orden-total')) {
            document.getElementById('orden-total').textContent = formatCurrency(total);
        }
    }
    
    if (e.target.id === 'monto-inicial') {
        const monto = parseFloat(e.target.value) || 0;
        document.getElementById('monto-inicial-display').textContent = formatCurrency(monto);
    }
});

// Envío de formularios
async function submitVenta() {
    const monto = parseFloat(document.getElementById('venta-monto').value);
    const metodoPago = document.getElementById('venta-metodo').value;

    if (!monto || monto <= 0) {
        alert('Por favor ingresa un monto válido');
        return;
    }

    showLoading(true);
    try {
        const response = await fetch(`${API_BASE}/ventas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                monto,
                metodoPago,
                timestamp: new Date().toISOString()
            })
        });

        if (response.ok) {
            closeModal();
            // El WebSocket se encargará de actualizar la vista
        } else {
            throw new Error('Error al registrar venta');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al registrar la venta');
    } finally {
        showLoading(false);
    }
}

async function submitOrden() {
    const cliente = document.getElementById('orden-cliente').value;
    const telefono = document.getElementById('orden-telefono').value;
    const direccion = document.getElementById('orden-direccion').value;
    const descripcion = document.getElementById('orden-descripcion').value;
    const monto = parseFloat(document.getElementById('orden-monto').value);
    const costoDelivery = parseFloat(document.getElementById('orden-delivery').value);
    const metodoPago = document.getElementById('orden-metodo').value;
    const repartidor = document.getElementById('orden-repartidor').value;

    if (!cliente || !telefono || !direccion || !descripcion || !monto || monto <= 0) {
        alert('Por favor completa todos los campos obligatorios');
        return;
    }

    showLoading(true);
    try {
        const response = await fetch(`${API_BASE}/ordenes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                cliente,
                telefono,
                direccion,
                descripcion,
                monto,
                costoDelivery,
                total: monto + costoDelivery,
                metodoPago,
                estado: 'recibida',
                repartidor,
                timestamp: new Date().toISOString()
            })
        });

        if (response.ok) {
            closeModal();
        } else {
            throw new Error('Error al registrar orden');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al registrar la orden');
    } finally {
        showLoading(false);
    }
}

async function submitGasto() {
    const concepto = document.getElementById('gasto-concepto').value;
    const monto = parseFloat(document.getElementById('gasto-monto').value);

    if (!concepto || !monto || monto <= 0) {
        alert('Por favor completa todos los campos');
        return;
    }

    showLoading(true);
    try {
        const response = await fetch(`${API_BASE}/gastos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                concepto,
                monto,
                timestamp: new Date().toISOString()
            })
        });

        if (response.ok) {
            closeModal();
        } else {
            throw new Error('Error al registrar gasto');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al registrar el gasto');
    } finally {
        showLoading(false);
    }
}

async function submitMontoInicial() {
    const monto = parseFloat(document.getElementById('monto-inicial').value);

    if (!monto || monto < 0) {
        alert('Por favor ingresa un monto válido');
        return;
    }

    showLoading(true);
    try {
        const fecha = new Date().toISOString().split('T')[0];
        const response = await fetch(`${API_BASE}/monto-inicial`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fecha, monto })
        });

        if (response.ok) {
            closeModal();
        } else {
            throw new Error('Error al establecer monto inicial');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al establecer el monto inicial');
    } finally {
        showLoading(false);
    }
}

// Acciones sobre items
async function anularVenta(id) {
    if (!confirm('¿Estás seguro de anular esta venta?')) return;

    showLoading(true);
    try {
        const response = await fetch(`${API_BASE}/ventas/${id}/anular`, {
            method: 'PUT'
        });

        if (!response.ok) {
            throw new Error('Error al anular venta');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al anular la venta');
    } finally {
        showLoading(false);
    }
}

async function anularOrden(id) {
    if (!confirm('¿Estás seguro de anular esta orden?')) return;

    showLoading(true);
    try {
        const response = await fetch(`${API_BASE}/ordenes/${id}/anular`, {
            method: 'PUT'
        });

        if (!response.ok) {
            throw new Error('Error al anular orden');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al anular la orden');
    } finally {
        showLoading(false);
    }
}

async function cambiarEstadoOrden(id, estado) {
    try {
        const response = await fetch(`${API_BASE}/ordenes/${id}/estado`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estado })
        });

        if (!response.ok) {
            throw new Error('Error al cambiar estado');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al cambiar el estado');
    }
}

async function cambiarMetodoPagoOrden(id, metodoPago) {
    try {
        const response = await fetch(`${API_BASE}/ordenes/${id}/metodoPago`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ metodoPago })
        });

        if (!response.ok) {
            throw new Error('Error al cambiar método de pago');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al cambiar el método de pago');
    }
}

// Actualización de vistas
function updateAllViews() {
    updateVentasView();
    updateOrdenesView(); 
    updateCajaView();
    updateControlsState();
    
    // Inicializar el display de venta
    actualizarDisplayVenta();
}

// Actualizar estado de controles basado en la fecha seleccionada
function updateControlsState() {
    const fechaEsHoy = esHoy();
    
    // Panel de nueva venta
    const ventaPanel = document.getElementById('nueva-venta-panel');
    if (ventaPanel) {
        if (fechaEsHoy) {
            ventaPanel.classList.remove('disabled');
        } else {
            ventaPanel.classList.add('disabled');
        }
    }
    
    // Deshabilitar botones de acción si no es hoy
    const botonesAccion = document.querySelectorAll('.payment-method-btn, .quick-amount-btn, .keypad-btn');
    botonesAccion.forEach(btn => {
        btn.disabled = !fechaEsHoy;
        if (!fechaEsHoy) {
            btn.style.opacity = '0.5';
            btn.style.pointerEvents = 'none';
        } else {
            btn.style.opacity = '1';
            btn.style.pointerEvents = 'auto';
        }
    });
    
    // Deshabilitar botones de nueva orden y gasto
    const botonesNuevos = document.querySelectorAll('[onclick*="openModal"]');
    botonesNuevos.forEach(btn => {
        if (!fechaEsHoy) {
            btn.style.opacity = '0.5';
            btn.style.pointerEvents = 'none';
            btn.setAttribute('title', 'Solo disponible para el día actual');
        } else {
            btn.style.opacity = '1';
            btn.style.pointerEvents = 'auto';
            btn.removeAttribute('title');
        }
    });
    
    // Mostrar mensaje informativo si no es hoy
    let infoMessage = document.getElementById('fecha-info-message');
    if (!fechaEsHoy) {
        if (!infoMessage) {
            infoMessage = document.createElement('div');
            infoMessage.id = 'fecha-info-message';
            infoMessage.className = 'fecha-info-message';
            infoMessage.innerHTML = `
                <div class="info-icon">📅</div>
                <div class="info-text">
                    <strong>Viendo fecha anterior</strong><br>
                    Los controles de creación y edición están deshabilitados
                </div>
            `;
            document.querySelector('.content').insertBefore(infoMessage, document.querySelector('.content').firstChild);
        }
        infoMessage.style.display = 'flex';
    } else {
        if (infoMessage) {
            infoMessage.style.display = 'none';
        }
    }
}

function updateVentasView() {
    const container = document.getElementById('ventas-list');
    const ventasRecientes = state.ventas.slice(0, 10);
    const fechaEsHoy = esHoy();

    container.innerHTML = ventasRecientes.map(venta => `
        <div class="item-card ${venta.anulada ? 'anulada' : ''}">
            <div class="item-header">
                <div class="item-info ${venta.anulada ? 'anulada' : ''}">
                    <h4>${formatCurrency(venta.monto)} ${venta.anulada ? '(ANULADA)' : ''}</h4>
                    <p>${venta.metodoPago}</p>
                    <p>${formatDateTime(venta.timestamp)}</p>
                </div>
                <div class="item-controls">
                    <div class="item-meta">
                        <span class="status-badge">Venta Local</span>
                        ${!venta.anulada && fechaEsHoy ? `
                            <button class="delete-btn" onclick="anularVenta(${venta.id})" title="Anular venta">
                                🗑️
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function updateOrdenesView() {
    // Actualizar contadores
    updateFilterCounts();

    // Filtrar y ordenar órdenes
    let ordenesFiltradas = filterOrdenes();
    ordenesFiltradas = sortOrdenes(ordenesFiltradas);
    
    const fechaEsHoy = esHoy();

    const container = document.getElementById('ordenes-list');
    const ordenesRecientes = ordenesFiltradas.slice(0, 20);

    if (ordenesRecientes.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #6b7280;">
                <p>No hay pedidos ${state.filtroEstado !== 'todos' ? `en estado "${state.filtroEstado.replace('-', ' ')}"` : ''}</p>
            </div>
        `;
        return;
    }

    container.innerHTML = ordenesRecientes.map(orden => `
        <div class="item-card orden ${orden.estado} ${orden.anulada ? 'anulada' : ''}">
            <div class="item-header">
                <div class="item-info ${orden.anulada ? 'anulada' : ''}">
                    <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                        <h4>${orden.cliente} ${orden.anulada ? '(ANULADA)' : ''}</h4>
                        <span class="status-badge ${orden.anulada ? 'anulada' : orden.estado}">
                            ${orden.anulada ? 'ANULADA' : orden.estado.toUpperCase().replace('-', ' ')}
                        </span>
                    </div>
                    <p>${orden.telefono}</p>
                    <p>${orden.direccion}</p>
                    <p class="item-description">📝 ${orden.descripcion}</p>
                    <div class="item-pricing">
                        <p>💰 Pedido: ${formatCurrency(orden.monto)}</p>
                        <p>🚚 Delivery: ${formatCurrency(orden.costoDelivery)}</p>
                        <p class="total">💵 Total: ${formatCurrency(orden.total)}</p>
                    </div>
                    ${!orden.anulada && fechaEsHoy ? `
                        <div class="payment-buttons">
                            <button class="payment-btn efectivo ${orden.metodoPago === 'efectivo' ? 'active' : ''}" 
                                    onclick="cambiarMetodoPagoOrden(${orden.id}, 'efectivo')">
                                💵 Efectivo
                            </button>
                            <button class="payment-btn tarjeta ${orden.metodoPago === 'tarjeta' ? 'active' : ''}"
                                    onclick="cambiarMetodoPagoOrden(${orden.id}, 'tarjeta')">
                                💳 Tarjeta
                            </button>
                            <button class="payment-btn transferencia ${orden.metodoPago === 'transferencia' ? 'active' : ''}"
                                    onclick="cambiarMetodoPagoOrden(${orden.id}, 'transferencia')">
                                🏦 Transfer
                            </button>
                        </div>
                    ` : !orden.anulada ? `
                        <div class="payment-status">
                            <span class="payment-status-label">Método de pago: </span>
                            <span class="payment-status-value">${orden.metodoPago.toUpperCase()}</span>
                        </div>
                    ` : ''}
                    <p style="font-size: 0.75rem; color: #6b7280; margin-top: 0.5rem;">
                        ${formatDateTime(orden.timestamp)}
                    </p>
                </div>
                <div class="item-controls">
                    <div class="item-meta">
                        <span style="font-size: 0.75rem; font-weight: 600; color: #3b82f6;">
                            ${orden.repartidor}
                        </span>
                        ${!orden.anulada && fechaEsHoy ? `
                            <button class="delete-btn" onclick="anularOrden(${orden.id})" title="Anular orden">
                                🗑️
                            </button>
                        ` : ''}
                    </div>
                    ${!orden.anulada && fechaEsHoy ? `
                        <div class="state-buttons">
                            <button class="state-btn recibida ${orden.estado === 'recibida' ? 'active' : ''}"
                                    onclick="cambiarEstadoOrden(${orden.id}, 'recibida')">
                                Recibida
                            </button>
                            <button class="state-btn preparando ${orden.estado === 'preparando' ? 'active' : ''}"
                                    onclick="cambiarEstadoOrden(${orden.id}, 'preparando')">
                                Preparando
                            </button>
                            <button class="state-btn en-camino ${orden.estado === 'en-camino' ? 'active' : ''}"
                                    onclick="cambiarEstadoOrden(${orden.id}, 'en-camino')">
                                En Camino
                            </button>
                            <button class="state-btn entregada ${orden.estado === 'entregada' ? 'active' : ''}"
                                    onclick="cambiarEstadoOrden(${orden.id}, 'entregada')">
                                Entregada
                            </button>
                        </div>
                    ` : !orden.anulada ? `
                        <div class="state-display">
                            <span style="font-size: 0.75rem; color: #6b7280; border: 1px solid #d1d5db; border-radius: 0.25rem; padding: 0.25rem 0.5rem;">
                                ${orden.estado.toUpperCase().replace('-', ' ')}
                            </span>
                        </div>
                    ` : `
                        <span style="font-size: 0.75rem; color: #6b7280; border: 1px solid #d1d5db; border-radius: 0.25rem; padding: 0.25rem 0.5rem; margin-top: 0.5rem;">
                            Anulada
                        </span>
                    `}
                </div>
            </div>
        </div>
    `).join('');
}

function updateFilterCounts() {
    const counts = {
        todos: state.ordenes.filter(o => !o.anulada).length,
        preparando: state.ordenes.filter(o => o.estado === 'preparando' && !o.anulada).length,
        recibida: state.ordenes.filter(o => o.estado === 'recibida' && !o.anulada).length,
        'en-camino': state.ordenes.filter(o => o.estado === 'en-camino' && !o.anulada).length,
        entregada: state.ordenes.filter(o => o.estado === 'entregada' && !o.anulada).length,
        anuladas: state.ordenes.filter(o => o.anulada).length
    };

    Object.keys(counts).forEach(key => {
        const element = document.getElementById(`count-${key}`);
        if (element) {
            element.textContent = counts[key];
        }
    });
}

function filterOrdenes() {
    if (state.filtroEstado === 'todos') {
        return state.ordenes;
    } else if (state.filtroEstado === 'anuladas') {
        return state.ordenes.filter(o => o.anulada);
    } else {
        return state.ordenes.filter(o => !o.anulada && o.estado === state.filtroEstado);
    }
}

function sortOrdenes(ordenes) {
    if (state.filtroEstado === 'todos') {
        // Ordenar por prioridad y fecha
        const prioridad = {
            'preparando': 1,
            'recibida': 2,
            'en-camino': 3,
            'entregada': 4
        };

        const activas = ordenes.filter(o => !o.anulada).sort((a, b) => {
            const prioA = prioridad[a.estado] || 5;
            const prioB = prioridad[b.estado] || 5;
            
            if (prioA !== prioB) {
                return prioA - prioB;
            }
            
            return new Date(b.timestamp) - new Date(a.timestamp);
        });

        const anuladas = ordenes.filter(o => o.anulada).sort((a, b) => 
            new Date(b.timestamp) - new Date(a.timestamp)
        );

        return [...activas, ...anuladas];
    } else {
        // Para filtros específicos, ordenar por fecha
        return ordenes.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }
}

function updateCajaView() {
    const totales = calcularTotalesDia();
    
    // Actualizar resumen principal
    document.getElementById('monto-inicial-display').textContent = formatCurrency(totales.montoInicial);
    document.getElementById('monto-inicial-detail').textContent = totales.montoInicial === 0 ? 'Sin establecer' : '';
    document.getElementById('ventas-totales').textContent = formatCurrency(totales.totalVentas);
    document.getElementById('transacciones-total').textContent = `${totales.totalTransacciones} transacciones`;
    document.getElementById('gastos-totales').textContent = formatCurrency(totales.totalGastos);
    document.getElementById('ganancia-total').textContent = formatCurrency(totales.ganancia);

    // Actualizar detalles por método de pago
    document.getElementById('efectivo-esperado').textContent = formatCurrency(totales.efectivoEsperado);
    document.getElementById('detail-inicial').textContent = formatCurrency(totales.montoInicial);
    document.getElementById('detail-ventas-efectivo').textContent = `+${formatCurrency(totales.ventasEfectivo)}`;
    document.getElementById('detail-gastos').textContent = `-${formatCurrency(totales.totalGastos)}`;
    
    document.getElementById('tarjeta-total').textContent = formatCurrency(totales.ventasTarjeta);
    document.getElementById('transferencia-total').textContent = formatCurrency(totales.ventasTransferencia);
    document.getElementById('total-general').textContent = formatCurrency(totales.totalVentas);
    document.getElementById('ganancia-neta').textContent = formatCurrency(totales.ganancia);

    // Mostrar/ocultar notas
    const tarjetaNote = document.getElementById('tarjeta-note');
    const transferenciaNote = document.getElementById('transferencia-note');
    tarjetaNote.style.display = totales.ventasTarjeta > 0 ? 'block' : 'none';
    transferenciaNote.style.display = totales.ventasTransferencia > 0 ? 'block' : 'none';

    // Mostrar/ocultar botón monto inicial
    const btnMontoInicial = document.getElementById('btn-monto-inicial');
    if (totales.montoInicial === 0) {
        btnMontoInicial.classList.remove('hidden');
    } else {
        btnMontoInicial.classList.add('hidden');
    }

    // Actualizar gastos del día
    updateGastosList();
}

function updateGastosList() {
    const fechaSeleccionada = new Date(state.fechaSeleccionada + 'T00:00:00').toDateString();
    const gastosFecha = state.gastos.filter(g => 
        new Date(g.timestamp).toDateString() === fechaSeleccionada
    ).slice(0, 10);

    const container = document.getElementById('gastos-list');
    
    if (gastosFecha.length === 0) {
        const esHoy = state.fechaSeleccionada === new Date().toISOString().split('T')[0];
        const mensaje = esHoy ? 'No hay gastos registrados hoy' : 'No hay gastos registrados en esta fecha';
        container.innerHTML = `<p style="text-align: center; color: #6b7280; padding: 1rem;">${mensaje}</p>`;
        return;
    }

    container.innerHTML = gastosFecha.map(gasto => `
        <div class="gasto-item">
            <div class="gasto-header">
                <span class="gasto-concepto">${gasto.concepto}</span>
                <span class="gasto-monto">-${formatCurrency(gasto.monto)}</span>
            </div>
            <p class="gasto-fecha">${formatDateTime(gasto.timestamp)}</p>
        </div>
    `).join('');
}

function calcularTotalesDia() {
    const fechaSeleccionada = new Date(state.fechaSeleccionada + 'T00:00:00').toDateString();
    
    const ventasFecha = state.ventas.filter(v => 
        new Date(v.timestamp).toDateString() === fechaSeleccionada && !v.anulada
    );
    
    const gastosFecha = state.gastos.filter(g => 
        new Date(g.timestamp).toDateString() === fechaSeleccionada
    );

    const ordenesFecha = state.ordenes.filter(o => 
        new Date(o.timestamp).toDateString() === fechaSeleccionada && !o.anulada
    );

    const totalVentasLocal = ventasFecha.reduce((sum, venta) => sum + venta.monto, 0);
    const totalVentasDelivery = ordenesFecha.reduce((sum, orden) => sum + orden.total, 0);
    const totalVentas = totalVentasLocal + totalVentasDelivery;
    const totalGastos = gastosFecha.reduce((sum, gasto) => sum + gasto.monto, 0);
    const totalTransacciones = ventasFecha.length + ordenesFecha.length;
    
    // Calcular ventas por método de pago
    const ventasEfectivo = ventasFecha
        .filter(item => item.metodoPago === 'efectivo')
        .reduce((sum, item) => sum + item.monto, 0) +
        ordenesFecha
        .filter(item => item.metodoPago === 'efectivo')
        .reduce((sum, item) => sum + item.total, 0);
    
    const ventasTarjeta = ventasFecha
        .filter(item => item.metodoPago === 'tarjeta')
        .reduce((sum, item) => sum + item.monto, 0) +
        ordenesFecha
        .filter(item => item.metodoPago === 'tarjeta')
        .reduce((sum, item) => sum + item.total, 0);
    
    const ventasTransferencia = ventasFecha
        .filter(item => item.metodoPago === 'transferencia')
        .reduce((sum, item) => sum + item.monto, 0) +
        ordenesFecha
        .filter(item => item.metodoPago === 'transferencia')
        .reduce((sum, item) => sum + item.total, 0);
    
    // Monto inicial del día seleccionado
    const montoInicial = state.montoInicial[state.fechaSeleccionada] || 0;
    
    // Efectivo esperado en caja
    const efectivoEsperado = montoInicial + ventasEfectivo - totalGastos;

    return {
        totalVentas,
        totalGastos,
        totalTransacciones,
        ganancia: totalVentas - totalGastos,
        ventasLocales: ventasFecha.length,
        delivery: ordenesFecha.length,
        montoInicial,
        ventasEfectivo,
        ventasTarjeta,
        ventasTransferencia,
        efectivoEsperado
    };
}

// Utilidades
function esHoy() {
    return state.fechaSeleccionada === new Date().toISOString().split('T')[0];
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP'
    }).format(amount);
}

function formatDateTime(timestamp) {
    return new Date(timestamp).toLocaleString('es-CO', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function showLoading(show) {
    const loading = document.getElementById('loading');
    if (show) {
        loading.classList.remove('hidden');
    } else {
        loading.classList.add('hidden');
    }
}

// Funciones del panel de ventas
function agregarDigito(digito) {
    const montoStr = state.ventaActual.toString();
    if (montoStr.length < 8) { // Máximo 8 dígitos
        state.ventaActual = parseInt(montoStr + digito) || 0;
        actualizarDisplayVenta();
    }
}

function borrarDigito() {
    const montoStr = state.ventaActual.toString();
    if (montoStr.length > 1) {
        state.ventaActual = parseInt(montoStr.slice(0, -1)) || 0;
    } else {
        state.ventaActual = 0;
    }
    actualizarDisplayVenta();
}

function limpiarMonto() {
    state.ventaActual = 0;
    actualizarDisplayVenta();
}

function establecerMonto(monto) {
    state.ventaActual = monto;
    actualizarDisplayVenta();
}

function actualizarDisplayVenta() {
    const display = document.getElementById('venta-display-amount');
    if (display) {
        display.textContent = formatCurrency(state.ventaActual);
    }
}

async function procesarVenta(metodoPago) {
    if (state.ventaActual <= 0) {
        alert('Por favor ingresa un monto válido');
        return;
    }

    showLoading(true);
    try {
        const response = await fetch(`${API_BASE}/ventas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                monto: state.ventaActual,
                metodoPago,
                timestamp: new Date().toISOString()
            })
        });

        if (response.ok) {
            // Limpiar el monto después de registrar la venta
            limpiarMonto();
            // El WebSocket se encargará de actualizar la vista
            
            // Mostrar mensaje de éxito
            const metodosMap = {
                'efectivo': 'EFECTIVO',
                'tarjeta': 'TARJETA', 
                'transferencia': 'TRANSFERENCIA'
            };
            
            // Feedback visual temporal
            mostrarFeedbackVenta(metodosMap[metodoPago]);
        } else {
            throw new Error('Error al registrar venta');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al registrar la venta');
    } finally {
        showLoading(false);
    }
}

function mostrarFeedbackVenta(metodo) {
    const display = document.getElementById('venta-display-amount');
    if (display) {
        const originalText = display.textContent;
        const originalColor = display.style.color;
        
        display.textContent = `✓ ${metodo}`;
        display.style.color = '#16a34a';
        
        setTimeout(() => {
            display.textContent = originalText;
            display.style.color = originalColor;
        }, 1500);
    }
}

function toggleHistorialVentas() {
    state.historialVisible = !state.historialVisible;
    const panel = document.getElementById('nueva-venta-panel');
    const historial = document.getElementById('historial-ventas');
    
    if (state.historialVisible) {
        panel.classList.add('hidden');
        historial.classList.remove('hidden');
        updateVentasView(); // Actualizar la lista de ventas
    } else {
        panel.classList.remove('hidden');
        historial.classList.add('hidden');
    }
}

// Funciones globales para eventos onclick
window.openModal = openModal;
window.closeModal = closeModal;
window.submitVenta = submitVenta;
window.submitOrden = submitOrden;
window.submitGasto = submitGasto;
window.submitMontoInicial = submitMontoInicial;
window.anularVenta = anularVenta;
window.anularOrden = anularOrden;
window.cambiarEstadoOrden = cambiarEstadoOrden;
window.cambiarMetodoPagoOrden = cambiarMetodoPagoOrden;
window.agregarDigito = agregarDigito;
window.borrarDigito = borrarDigito;
window.limpiarMonto = limpiarMonto;
window.establecerMonto = establecerMonto;
window.procesarVenta = procesarVenta;
window.toggleHistorialVentas = toggleHistorialVentas;
window.setFilter = setFilter;
window.generarReporteDiario = generarReporteDiario;

// Generar reporte diario en PDF
async function generarReporteDiario() {
    try {
        showLoading(true);
        
        const hoy = new Date().toISOString().split('T')[0];
        const response = await fetch(`${API_BASE}/reporte-diario/${hoy}`);
        
        if (!response.ok) {
            throw new Error('Error al generar el reporte');
        }
        
        // Crear blob con el PDF
        const blob = await response.blob();
        
        // Crear URL temporal y descargar
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte-diario-${hoy.replace(/-/g, '')}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showLoading(false);
        
    } catch (error) {
        showLoading(false);
        console.error('Error generando reporte:', error);
        alert('❌ Error al generar el reporte. Inténtalo nuevamente.');
    }
}

// ============= FUNCIONES DE CLIENTES =============

async function cargarClientes() {
    try {
        const response = await fetch(`${API_BASE}/clientes`);
        state.clientes = await response.json();
        updateClientesView();
    } catch (error) {
        console.error('Error cargando clientes:', error);
    }
}

function updateClientesView() {
    const list = document.getElementById('clientes-list');
    if (!list) return;

    if (state.clientes.length === 0) {
        list.innerHTML = '<p class="no-data">No hay clientes registrados</p>';
        return;
    }

    list.innerHTML = state.clientes.map(cliente => `
        <div class="cliente-card">
            <div class="cliente-header">
                <div class="cliente-info">
                    <h4>${cliente.nombre}</h4>
                    <div class="cliente-telefono">
                        📞 ${cliente.telefono}
                    </div>
                    ${cliente.rnc ? `<span class="cliente-rnc">RNC: ${cliente.rnc}</span>` : ''}
                </div>
            </div>
            ${cliente.direccion ? `<div class="cliente-direccion">📍 ${cliente.direccion}</div>` : ''}
            ${cliente.email ? `<div class="cliente-email">✉️ ${cliente.email}</div>` : ''}
            <div class="cliente-actions">
                <button class="btn-secondary btn-sm" onclick="editarCliente('${cliente._id}')">
                    ✏️ Editar
                </button>
                <button class="btn-primary btn-sm" onclick="crearFacturaParaCliente('${cliente._id}')">
                    📄 Facturar
                </button>
                <button class="btn-danger btn-sm" onclick="desactivarCliente('${cliente._id}')">
                    🗑️ Desactivar
                </button>
            </div>
        </div>
    `).join('');
}

function filtrarClientes() {
    const busqueda = document.getElementById('buscar-cliente').value.toLowerCase();
    const clientesFiltrados = state.clientes.filter(cliente => 
        cliente.nombre.toLowerCase().includes(busqueda) ||
        cliente.telefono.includes(busqueda) ||
        (cliente.rnc && cliente.rnc.includes(busqueda))
    );

    const list = document.getElementById('clientes-list');
    if (clientesFiltrados.length === 0) {
        list.innerHTML = '<p class="no-data">No se encontraron clientes</p>';
        return;
    }

    list.innerHTML = clientesFiltrados.map(cliente => `
        <div class="cliente-card">
            <div class="cliente-header">
                <div class="cliente-info">
                    <h4>${cliente.nombre}</h4>
                    <div class="cliente-telefono">
                        📞 ${cliente.telefono}
                    </div>
                    ${cliente.rnc ? `<span class="cliente-rnc">RNC: ${cliente.rnc}</span>` : ''}
                </div>
            </div>
            ${cliente.direccion ? `<div class="cliente-direccion">📍 ${cliente.direccion}</div>` : ''}
            ${cliente.email ? `<div class="cliente-email">✉️ ${cliente.email}</div>` : ''}
            <div class="cliente-actions">
                <button class="btn-secondary btn-sm" onclick="editarCliente('${cliente._id}')">
                    ✏️ Editar
                </button>
                <button class="btn-primary btn-sm" onclick="crearFacturaParaCliente('${cliente._id}')">
                    📄 Facturar
                </button>
                <button class="btn-danger btn-sm" onclick="desactivarCliente('${cliente._id}')">
                    🗑️ Desactivar
                </button>
            </div>
        </div>
    `).join('');
}

async function guardarCliente(event) {
    event.preventDefault();
    
    try {
        showLoading(true);
        
        const creditoHabilitado = document.getElementById('cliente-credito-habilitado').checked;
        
        const formData = {
            nombre: document.getElementById('cliente-nombre').value,
            telefono: document.getElementById('cliente-telefono').value,
            rnc: document.getElementById('cliente-rnc').value,
            direccion: document.getElementById('cliente-direccion').value,
            email: document.getElementById('cliente-email').value,
            creditoHabilitado: creditoHabilitado,
            limiteCredito: creditoHabilitado ? parseFloat(document.getElementById('cliente-limite-credito').value) || 0 : 0,
            diasCredito: creditoHabilitado ? parseInt(document.getElementById('cliente-dias-credito').value) || 30 : 0
        };

        const clienteId = document.getElementById('form-cliente').dataset.clienteId;
        const method = clienteId ? 'PUT' : 'POST';
        const url = clienteId ? `${API_BASE}/clientes/${clienteId}` : `${API_BASE}/clientes`;

        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        if (!response.ok) throw new Error('Error al guardar cliente');

        const cliente = await response.json();
        
        if (clienteId) {
            // Actualizar cliente existente
            const index = state.clientes.findIndex(c => c._id === clienteId);
            if (index !== -1) {
                state.clientes[index] = cliente;
            }
        } else {
            // Agregar nuevo cliente
            state.clientes.unshift(cliente);
        }

        updateClientesView();
        closeModal();
        showLoading(false);
        
    } catch (error) {
        showLoading(false);
        console.error('Error guardando cliente:', error);
        alert('❌ Error al guardar cliente');
    }
}

async function editarCliente(id) {
    const cliente = state.clientes.find(c => c._id === id);
    if (!cliente) return;

    openModal('cliente');
    
    // Llenar formulario
    document.getElementById('cliente-nombre').value = cliente.nombre;
    document.getElementById('cliente-telefono').value = cliente.telefono;
    document.getElementById('cliente-rnc').value = cliente.rnc || '';
    document.getElementById('cliente-direccion').value = cliente.direccion || '';
    document.getElementById('cliente-email').value = cliente.email || '';
    
    // Marcar como edición
    document.getElementById('form-cliente').dataset.clienteId = id;
    document.getElementById('modal-title').textContent = 'Editar Cliente';
}

async function desactivarCliente(id) {
    if (!confirm('¿Estás seguro de desactivar este cliente?')) return;

    try {
        showLoading(true);
        
        const response = await fetch(`${API_BASE}/clientes/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Error al desactivar cliente');

        // Remover de la lista
        state.clientes = state.clientes.filter(c => c._id !== id);
        updateClientesView();
        showLoading(false);
        
    } catch (error) {
        showLoading(false);
        console.error('Error desactivando cliente:', error);
        alert('❌ Error al desactivar cliente');
    }
}

// ============= FUNCIONES DE FACTURAS =============

async function cargarFacturas() {
    try {
        const filtros = new URLSearchParams();
        
        const periodo = document.getElementById('filtro-periodo')?.value || 'hoy';
        const tipo = document.getElementById('filtro-tipo')?.value;
        const rnc = document.getElementById('filtro-rnc')?.value;

        if (periodo === 'hoy') {
            filtros.append('fecha', state.fechaSeleccionada);
        } else if (periodo === 'mes') {
            const fecha = new Date();
            filtros.append('mes', fecha.getMonth() + 1);
            filtros.append('anio', fecha.getFullYear());
        } else if (periodo === 'personalizado') {
            const desde = document.getElementById('fecha-desde')?.value;
            const hasta = document.getElementById('fecha-hasta')?.value;
            if (desde) filtros.append('fechaDesde', desde);
            if (hasta) filtros.append('fechaHasta', hasta);
        }

        if (tipo) filtros.append('tipo', tipo);
        if (rnc) filtros.append('rnc', rnc);

        const response = await fetch(`${API_BASE}/facturas?${filtros}`);
        state.facturas = await response.json();
        updateFacturasView();
    } catch (error) {
        console.error('Error cargando facturas:', error);
    }
}

function updateFacturasView() {
    const list = document.getElementById('facturas-list');
    if (!list) return;

    if (state.facturas.length === 0) {
        list.innerHTML = '<p class="no-data">No hay facturas para los filtros seleccionados</p>';
        return;
    }

    list.innerHTML = state.facturas.map(factura => `
        <div class="factura-card ${factura.anulada ? 'anulada' : ''}">
            <div class="factura-header">
                <div>
                    <div class="factura-numero">${factura.numero}</div>
                    <span class="factura-tipo ${factura.tipoComprobante}">${factura.tipoComprobante}</span>
                    ${factura.anulada ? '<span class="factura-anulada">ANULADA</span>' : ''}
                </div>
                <div class="factura-total">$${factura.total.toFixed(2)}</div>
            </div>
            <div class="factura-cliente">${factura.cliente.nombre}</div>
            <div class="factura-fecha">${new Date(factura.fechaEmision).toLocaleDateString('es-DO')}</div>
            ${factura.rnc ? `<div class="factura-rnc">RNC: ${factura.rnc}</div>` : ''}
            ${!factura.anulada ? `
                <div class="factura-actions">
                    <button class="btn-primary btn-sm" onclick="descargarFacturaPDF('${factura._id}')">
                        📄 PDF
                    </button>
                    <button class="btn-warning btn-sm" onclick="anularFactura('${factura._id}')">
                        ❌ Anular
                    </button>
                </div>
            ` : ''}
        </div>
    `).join('');
}

async function generarFactura(event) {
    event.preventDefault();
    
    try {
        showLoading(true);
        
        const clienteId = document.getElementById('factura-cliente').value;
        const tipoComprobante = document.getElementById('factura-tipo').value;
        const requiereRNC = document.getElementById('requiere-rnc').checked;
        
        // Recopilar productos
        const productos = [];
        const productosItems = document.querySelectorAll('.producto-item');
        
        productosItems.forEach(item => {
            const descripcion = item.querySelector('.producto-descripcion').value;
            const cantidad = parseInt(item.querySelector('.producto-cantidad').value);
            const precioUnitario = parseFloat(item.querySelector('.producto-precio').value);
            
            if (descripcion && cantidad && precioUnitario) {
                productos.push({
                    descripcion,
                    cantidad,
                    precioUnitario
                });
            }
        });

        if (productos.length === 0) {
            alert('Debe agregar al menos un producto');
            showLoading(false);
            return;
        }

        const response = await fetch(`${API_BASE}/facturas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                clienteId,
                tipoComprobante,
                requiereRNC,
                productos
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al generar factura');
        }

        const factura = await response.json();
        
        // Actualizar lista
        state.facturas.unshift(factura);
        updateFacturasView();
        
        closeModal();
        showLoading(false);
        
        // Preguntar si desea descargar PDF
        if (confirm('Factura generada exitosamente. ¿Desea descargar el PDF?')) {
            descargarFacturaPDF(factura._id);
        }
        
    } catch (error) {
        showLoading(false);
        console.error('Error generando factura:', error);
        alert('❌ ' + error.message);
    }
}

async function descargarFacturaPDF(facturaId) {
    try {
        showLoading(true);
        
        const response = await fetch(`${API_BASE}/facturas/${facturaId}/pdf`);
        if (!response.ok) throw new Error('Error al generar PDF');

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `factura-${facturaId}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showLoading(false);
        
    } catch (error) {
        showLoading(false);
        console.error('Error descargando PDF:', error);
        alert('❌ Error al descargar PDF');
    }
}

async function anularFactura(facturaId) {
    const motivo = prompt('Ingrese el motivo de anulación:');
    if (!motivo) return;

    try {
        showLoading(true);
        
        const response = await fetch(`${API_BASE}/facturas/${facturaId}/anular`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ motivo })
        });

        if (!response.ok) throw new Error('Error al anular factura');

        const facturaAnulada = await response.json();
        
        // Actualizar en la lista
        const index = state.facturas.findIndex(f => f._id === facturaId);
        if (index !== -1) {
            state.facturas[index] = facturaAnulada;
        }

        updateFacturasView();
        showLoading(false);
        
    } catch (error) {
        showLoading(false);
        console.error('Error anulando factura:', error);
        alert('❌ Error al anular factura');
    }
}

function crearFacturaParaCliente(clienteId) {
    openModal('factura');
    
    // Preseleccionar cliente
    setTimeout(() => {
        document.getElementById('factura-cliente').value = clienteId;
        actualizarDatosCliente();
    }, 100);
}

function actualizarDatosCliente() {
    const clienteId = document.getElementById('factura-cliente').value;
    const cliente = state.clientes.find(c => c._id === clienteId);
    
    if (cliente && cliente.rnc) {
        document.getElementById('factura-tipo').value = 'FACTURA';
        toggleRNCOptions();
    }
}

function toggleRNCOptions() {
    const tipo = document.getElementById('factura-tipo').value;
    const rncOptions = document.getElementById('rnc-options');
    
    if (tipo === 'FACTURA') {
        rncOptions.classList.remove('hidden');
    } else {
        rncOptions.classList.add('hidden');
        document.getElementById('requiere-rnc').checked = false;
    }
}

function agregarProducto() {
    const container = document.getElementById('productos-container');
    const nuevoProducto = container.firstElementChild.cloneNode(true);
    
    // Limpiar valores
    nuevoProducto.querySelectorAll('input').forEach(input => {
        if (input.classList.contains('producto-cantidad')) {
            input.value = '1';
        } else if (!input.readOnly) {
            input.value = '';
        }
    });
    
    // Agregar botón de eliminar
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'btn-danger btn-sm';
    deleteBtn.textContent = '🗑️';
    deleteBtn.onclick = function() {
        if (container.children.length > 1) {
            container.removeChild(nuevoProducto);
            calcularTotalesFactura();
        }
    };
    
    nuevoProducto.querySelector('.form-row').appendChild(deleteBtn);
    container.appendChild(nuevoProducto);
    
    // Agregar eventos de cálculo
    setupProductoCalculation(nuevoProducto);
}

function setupProductoCalculation(productoItem) {
    const cantidad = productoItem.querySelector('.producto-cantidad');
    const precio = productoItem.querySelector('.producto-precio');
    const total = productoItem.querySelector('.producto-total');
    
    const calcular = () => {
        const cant = parseFloat(cantidad.value) || 0;
        const prec = parseFloat(precio.value) || 0;
        total.value = (cant * prec).toFixed(2);
        calcularTotalesFactura();
    };
    
    cantidad.addEventListener('input', calcular);
    precio.addEventListener('input', calcular);
}

function calcularTotalesFactura() {
    let subtotal = 0;
    
    document.querySelectorAll('.producto-total').forEach(input => {
        subtotal += parseFloat(input.value) || 0;
    });
    
    const impuesto = subtotal * 0.18;
    const total = subtotal + impuesto;
    
    document.getElementById('factura-subtotal').textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById('factura-impuesto').textContent = `$${impuesto.toFixed(2)}`;
    document.getElementById('factura-total').textContent = `$${total.toFixed(2)}`;
}

function filtrarFacturas() {
    const periodo = document.getElementById('filtro-periodo').value;
    const filtroFechas = document.getElementById('filtro-fechas');
    
    if (periodo === 'personalizado') {
        filtroFechas.style.display = 'flex';
    } else {
        filtroFechas.style.display = 'none';
    }
    
    cargarFacturas();
}

// ============= FUNCIONES DE CONFIGURACIÓN RNC =============

async function cargarConfiguracionesRNC() {
    try {
        const response = await fetch(`${API_BASE}/configuracion-rnc`);
        state.configuracionesRNC = await response.json();
        updateConfiguracionesRNCView();
    } catch (error) {
        console.error('Error cargando configuraciones RNC:', error);
    }
}

function updateConfiguracionesRNCView() {
    const container = document.querySelector('.configuraciones-rnc-list');
    if (!container) return;

    if (state.configuracionesRNC.length === 0) {
        container.innerHTML = '<p class="no-data">No hay configuraciones RNC</p>';
        return;
    }

    container.innerHTML = state.configuracionesRNC.map(config => {
        const usados = config.secuenciaActual - config.secuenciaInicial;
        const disponibles = config.secuenciaFinal - config.secuenciaInicial + 1;
        const porcentaje = (usados / disponibles) * 100;
        
        return `
            <div class="configuracion-card">
                <div class="configuracion-header">
                    <div class="configuracion-info">
                        <h4>${config.nombre} - ${config.prefijo}</h4>
                        <div class="configuracion-descripcion">${config.descripcion}</div>
                    </div>
                    <span class="secuencia-estado ${config.activa ? 'activa' : 'inactiva'}">
                        ${config.activa ? 'ACTIVA' : 'INACTIVA'}
                    </span>
                </div>
                <div class="configuracion-detalles">
                    <div class="detalle-item">
                        <div class="detalle-label">Rango:</div>
                        <div class="detalle-valor">${config.secuenciaInicial} - ${config.secuenciaFinal}</div>
                    </div>
                    <div class="detalle-item">
                        <div class="detalle-label">Actual:</div>
                        <div class="detalle-valor">${config.secuenciaActual}</div>
                    </div>
                    <div class="detalle-item">
                        <div class="detalle-label">Vencimiento:</div>
                        <div class="detalle-valor">${new Date(config.fechaVencimiento).toLocaleDateString('es-DO')}</div>
                    </div>
                </div>
                <div class="progreso-secuencia">
                    <div class="progreso-barra">
                        <div class="progreso-fill" style="width: ${porcentaje}%"></div>
                    </div>
                    <div class="progreso-texto">${usados} de ${disponibles} utilizados (${porcentaje.toFixed(1)}%)</div>
                </div>
            </div>
        `;
    }).join('');
}

async function guardarConfiguracionRNC(event) {
    event.preventDefault();
    
    try {
        showLoading(true);
        
        const formData = {
            nombre: document.getElementById('rnc-nombre').value,
            descripcion: document.getElementById('rnc-descripcion').value,
            prefijo: document.getElementById('rnc-prefijo').value,
            secuenciaInicial: parseInt(document.getElementById('rnc-inicio').value),
            secuenciaFinal: parseInt(document.getElementById('rnc-final').value),
            fechaVencimiento: document.getElementById('rnc-vencimiento').value,
            activa: document.getElementById('rnc-activa').checked
        };

        const response = await fetch(`${API_BASE}/configuracion-rnc`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        if (!response.ok) throw new Error('Error al guardar configuración');

        const config = await response.json();
        state.configuracionesRNC.unshift(config);
        updateConfiguracionesRNCView();
        
        closeModal();
        showLoading(false);
        
    } catch (error) {
        showLoading(false);
        console.error('Error guardando configuración RNC:', error);
        alert('❌ Error al guardar configuración RNC');
    }
}

async function generarReporteRNC() {
    openModal('reporte-rnc');
    
    // Establecer mes y año actual
    const fecha = new Date();
    document.getElementById('reporte-mes').value = fecha.getMonth() + 1;
    document.getElementById('reporte-anio').value = fecha.getFullYear();
}

async function descargarReporteRNC(event) {
    event.preventDefault();
    
    try {
        showLoading(true);
        
        const mes = document.getElementById('reporte-mes').value;
        const anio = document.getElementById('reporte-anio').value;
        
        const response = await fetch(`${API_BASE}/reportes/facturas-rnc?mes=${mes}&anio=${anio}`);
        if (!response.ok) throw new Error('Error al generar reporte');

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte-rnc-${mes}-${anio}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        closeModal();
        showLoading(false);
        
    } catch (error) {
        showLoading(false);
        console.error('Error descargando reporte RNC:', error);
        alert('❌ Error al descargar reporte RNC');
    }
}

// Exponer funciones globalmente
window.cargarClientes = cargarClientes;
window.filtrarClientes = filtrarClientes;
window.guardarCliente = guardarCliente;
window.editarCliente = editarCliente;
window.desactivarCliente = desactivarCliente;
window.crearFacturaParaCliente = crearFacturaParaCliente;
window.generarFactura = generarFactura;
window.descargarFacturaPDF = descargarFacturaPDF;
window.anularFactura = anularFactura;
window.actualizarDatosCliente = actualizarDatosCliente;
window.toggleRNCOptions = toggleRNCOptions;
window.agregarProducto = agregarProducto;
window.calcularTotalesFactura = calcularTotalesFactura;
window.filtrarFacturas = filtrarFacturas;
window.guardarConfiguracionRNC = guardarConfiguracionRNC;
window.generarReporteRNC = generarReporteRNC;
window.descargarReporteRNC = descargarReporteRNC;

// Funciones de Créditos
window.verificarCreditoCliente = verificarCreditoCliente;
window.agregarProductoConduce = agregarProductoConduce;
window.eliminarProductoConduce = eliminarProductoConduce;
window.calcularTotalConduce = calcularTotalConduce;
window.guardarConduce = guardarConduce;
window.cargarConducesPendientes = cargarConducesPendientes;
window.toggleConduceSelection = toggleConduceSelection;
window.pagarCreditos = pagarCreditos;
window.filtrarCreditos = filtrarCreditos;
window.verConducePDF = verConducePDF;
window.anularConduce = anularConduce;
window.setupConduceModal = setupConduceModal;
window.setupPagarCreditosModal = setupPagarCreditosModal;
window.toggleCreditoFields = toggleCreditoFields;

// ====== SISTEMA DE CRÉDITOS ======

// Toggle para mostrar/ocultar campos de crédito
function toggleCreditoFields() {
    const creditoHabilitado = document.getElementById('cliente-credito-habilitado').checked;
    const creditoFields = document.getElementById('credito-fields');
    
    if (creditoHabilitado) {
        creditoFields.classList.remove('hidden');
    } else {
        creditoFields.classList.add('hidden');
    }
}

// Verificar información de crédito del cliente
async function verificarCreditoCliente() {
    const clienteId = document.getElementById('conduce-cliente').value;
    const creditoInfo = document.getElementById('credito-info');
    
    if (!clienteId) {
        creditoInfo.classList.add('hidden');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/clientes/${clienteId}`);
        const cliente = await response.json();
        
        if (cliente.creditoHabilitado) {
            document.getElementById('limite-credito').textContent = `$${cliente.limiteCredito.toFixed(2)}`;
            document.getElementById('saldo-pendiente').textContent = `$${cliente.saldoPendiente.toFixed(2)}`;
            document.getElementById('credito-disponible').textContent = `$${(cliente.limiteCredito - cliente.saldoPendiente).toFixed(2)}`;
            creditoInfo.classList.remove('hidden');
        } else {
            creditoInfo.classList.add('hidden');
            showNotification('Este cliente no tiene crédito habilitado', 'warning');
        }
    } catch (error) {
        console.error('Error verificando crédito:', error);
        creditoInfo.classList.add('hidden');
    }
}

// Agregar producto al conduce
function agregarProductoConduce() {
    const productosContainer = document.getElementById('productos-conduce');
    const nuevoProducto = document.createElement('div');
    nuevoProducto.className = 'producto-item';
    nuevoProducto.innerHTML = `
        <input type="text" placeholder="Descripción del producto" name="descripcion" required>
        <input type="number" placeholder="Cantidad" name="cantidad" min="1" required onchange="calcularTotalConduce()">
        <input type="number" placeholder="Precio" name="precio" min="0" step="0.01" required onchange="calcularTotalConduce()">
        <button type="button" class="btn-danger btn-sm" onclick="eliminarProductoConduce(this)">✕</button>
    `;
    productosContainer.appendChild(nuevoProducto);
}

// Eliminar producto del conduce
function eliminarProductoConduce(button) {
    const productosContainer = document.getElementById('productos-conduce');
    if (productosContainer.children.length > 1) {
        button.closest('.producto-item').remove();
        calcularTotalConduce();
    }
}

// Calcular total del conduce
function calcularTotalConduce() {
    const productos = document.querySelectorAll('#productos-conduce .producto-item');
    let subtotal = 0;
    
    productos.forEach(producto => {
        const cantidad = parseFloat(producto.querySelector('[name="cantidad"]').value) || 0;
        const precio = parseFloat(producto.querySelector('[name="precio"]').value) || 0;
        subtotal += cantidad * precio;
    });
    
    const impuesto = subtotal * 0.18;
    const total = subtotal + impuesto;
    
    document.getElementById('conduce-subtotal').textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById('conduce-impuesto').textContent = `$${impuesto.toFixed(2)}`;
    document.getElementById('conduce-total').textContent = `$${total.toFixed(2)}`;
    
    // Verificar límite de crédito
    const clienteId = document.getElementById('conduce-cliente').value;
    if (clienteId) {
        verificarLimiteCredito(total);
    }
}

// Verificar límite de crédito disponible
async function verificarLimiteCredito(totalConduce) {
    const clienteId = document.getElementById('conduce-cliente').value;
    
    try {
        const response = await fetch(`${API_BASE}/clientes/${clienteId}`);
        const cliente = await response.json();
        
        const creditoDisponible = cliente.limiteCredito - cliente.saldoPendiente;
        const btnGuardar = document.getElementById('btn-guardar-conduce');
        
        if (totalConduce > creditoDisponible) {
            btnGuardar.disabled = true;
            btnGuardar.textContent = 'Excede límite de crédito';
            btnGuardar.className = 'btn-danger';
        } else {
            btnGuardar.disabled = false;
            btnGuardar.textContent = 'Generar Conduce';
            btnGuardar.className = 'btn-success';
        }
    } catch (error) {
        console.error('Error verificando límite:', error);
    }
}

// Guardar conduce
async function guardarConduce(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const clienteId = formData.get('conduce-cliente') || document.getElementById('conduce-cliente').value;
    
    const productos = [];
    const productosItems = document.querySelectorAll('#productos-conduce .producto-item');
    
    productosItems.forEach(item => {
        const descripcion = item.querySelector('[name="descripcion"]').value;
        const cantidad = parseFloat(item.querySelector('[name="cantidad"]').value);
        const precio = parseFloat(item.querySelector('[name="precio"]').value);
        
        if (descripcion && cantidad && precio) {
            productos.push({
                descripcion,
                cantidad,
                precioUnitario: precio,
                total: cantidad * precio
            });
        }
    });
    
    if (productos.length === 0) {
        showNotification('Debe agregar al menos un producto', 'error');
        return;
    }
    
    const conduceData = {
        clienteId,
        productos
    };
    
    try {
        showLoading(true);
        const response = await fetch(`${API_BASE}/conduces`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(conduceData)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al crear el conduce');
        }
        
        const conduce = await response.json();
        
        closeModal();
        showNotification('Conduce creado exitosamente', 'success');
        await loadCreditos();
        
        // Preguntar si quiere descargar el PDF
        if (confirm('¿Desea descargar el conduce en PDF?')) {
            verConducePDF(conduce._id);
        }
        
    } catch (error) {
        console.error('Error guardando conduce:', error);
        showNotification(error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Cargar conduces pendientes para pago
async function cargarConducesPendientes() {
    const clienteId = document.getElementById('pago-cliente').value;
    const conducesContainer = document.getElementById('conduces-pendientes');
    const conducesList = document.getElementById('conduces-list-pago');
    
    if (!clienteId) {
        conducesContainer.classList.add('hidden');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/conduces?cliente=${clienteId}&estado=pendiente`);
        const conduces = await response.json();
        
        if (conduces.length === 0) {
            conducesList.innerHTML = '<div class="no-data">No hay conduces pendientes para este cliente</div>';
        } else {
            conducesList.innerHTML = conduces.map(conduce => `
                <div class="conduce-item" onclick="toggleConduceSelection('${conduce._id}')">
                    <input type="checkbox" id="conduce-${conduce._id}" onchange="updatePagoSummary()">
                    <div class="conduce-details">
                        <div class="conduce-numero">${conduce.numero}</div>
                        <div class="conduce-fecha">${new Date(conduce.fechaCreacion).toLocaleDateString()}</div>
                    </div>
                    <div class="conduce-total">$${conduce.total.toFixed(2)}</div>
                </div>
            `).join('');
        }
        
        conducesContainer.classList.remove('hidden');
        updatePagoSummary();
        
    } catch (error) {
        console.error('Error cargando conduces:', error);
        showNotification('Error cargando conduces pendientes', 'error');
    }
}

// Toggle selección de conduce
function toggleConduceSelection(conduceId) {
    const checkbox = document.getElementById(`conduce-${conduceId}`);
    checkbox.checked = !checkbox.checked;
    updatePagoSummary();
}

// Actualizar resumen de pago
function updatePagoSummary() {
    const checkboxes = document.querySelectorAll('#conduces-list-pago input[type="checkbox"]:checked');
    const count = checkboxes.length;
    
    let total = 0;
    checkboxes.forEach(checkbox => {
        const conduceItem = checkbox.closest('.conduce-item');
        const totalText = conduceItem.querySelector('.conduce-total').textContent;
        total += parseFloat(totalText.replace('$', ''));
    });
    
    document.getElementById('conduces-seleccionados-count').textContent = count;
    document.getElementById('total-pagar').textContent = `$${total.toFixed(2)}`;
    document.getElementById('btn-pagar-creditos').disabled = count === 0;
}

// Procesar pago de créditos
async function pagarCreditos(event) {
    event.preventDefault();
    const btn = document.getElementById('btn-pagar-creditos');
    if (btn) btn.disabled = true;
    try {
        const clienteId = document.getElementById('pago-cliente').value;
        const checkboxes = document.querySelectorAll('#conduces-list-pago input[type="checkbox"]:checked');
        const generarFacturaRNC = document.getElementById('generar-factura-rnc').checked;
        const conducesIds = Array.from(checkboxes).map(cb => cb.id.replace('conduce-', ''));
        console.log('Datos del pago:', { clienteId, conducesIds, generarFacturaRNC });
        if (conducesIds.length === 0) {
            showNotification('Debe seleccionar al menos un conduce', 'error');
            if (btn) btn.disabled = false;
            return;
        }
        showLoading(true);
        // Crear factura agrupando los conduces
        const facturaData = {
            clienteId,
            conducesIds,
            tipoComprobante: generarFacturaRNC ? 'FACTURA' : 'BOLETA',
            requiereRNC: generarFacturaRNC,
            fechaEmision: state.fechaSeleccionada // YYYY-MM-DD
        };
        console.log('Enviando datos al servidor:', facturaData);
        const response = await fetch(`${API_BASE}/facturas`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(facturaData)
        });
        console.log('Respuesta del servidor:', response.status, response.statusText);
        if (!response.ok) {
            let errorMsg = 'Error al procesar el pago';
            try {
                const error = await response.json();
                errorMsg = error.error || errorMsg;
                console.error('Error del servidor:', error);
            } catch(e) {}
            showNotification(errorMsg, 'error');
            if (btn) btn.disabled = false;
            return;
        }
        const factura = await response.json();
        console.log('Factura creada:', factura);
        closeModal();
        showNotification('Pago procesado exitosamente', 'success');
        await loadCreditos();
        await cargarFacturas();
        // Preguntar si quiere descargar la factura
        if (factura && factura._id && confirm('¿Desea descargar la factura en PDF?')) {
            descargarFacturaPDF(factura._id);
        }
    } catch (error) {
        console.error('Error procesando pago:', error);
        showNotification(error.message || 'Error inesperado al procesar el pago', 'error');
    } finally {
        showLoading(false);
        if (btn) btn.disabled = false;
    }
}

// Cargar datos de créditos
async function loadCreditos() {
    try {
        const [conducesResponse, clientesResponse] = await Promise.all([
            fetch(`${API_BASE}/conduces`),
            fetch(`${API_BASE}/clientes`)
        ]);
        
        const conduces = await conducesResponse.json();
        const clientes = await clientesResponse.json();
        
        // Actualizar estado global
        state.conduces = conduces;
        state.clientes = clientes; // Asegurar que tenemos los clientes actualizados
        
        // Actualizar resumen
        updateCreditosSummary(conduces);
        
        // Actualizar lista de conduces
        renderConducesList(conduces);
        
        // Actualizar filtros de clientes
        updateClientFilters(clientes);
        
    } catch (error) {
        console.error('Error cargando créditos:', error);
        showNotification('Error cargando datos de créditos', 'error');
    }
}

// Actualizar resumen de créditos
function updateCreditosSummary(conduces) {
    const pendientes = conduces.filter(c => c.estado === 'pendiente');
    const pagadosHoy = conduces.filter(c => 
        c.estado === 'pagado' && 
        new Date(c.updatedAt).toDateString() === new Date().toDateString()
    );
    
    const totalPendiente = pendientes.reduce((sum, c) => sum + c.total, 0);
    const totalPagadoHoy = pagadosHoy.reduce((sum, c) => sum + c.total, 0);
    
    document.getElementById('creditos-pendientes-total').textContent = `$${totalPendiente.toFixed(2)}`;
    document.getElementById('creditos-pendientes-count').textContent = `${pendientes.length} conduces`;
    document.getElementById('creditos-pagados-hoy').textContent = `$${totalPagadoHoy.toFixed(2)}`;
    document.getElementById('creditos-pagados-count').textContent = `${pagadosHoy.length} facturas`;
}

// Renderizar lista de conduces
function renderConducesList(conduces) {
    const container = document.getElementById('conduces-list');
    
    if (conduces.length === 0) {
        container.innerHTML = '<div class="no-data">No hay conduces registrados</div>';
        return;
    }
    
    container.innerHTML = conduces.map(conduce => `
        <div class="conduce-card">
            <div class="conduce-header">
                <h4>${conduce.numero}</h4>
                <span class="conduce-estado ${conduce.estado}">${conduce.estado}</span>
            </div>
            <div class="conduce-info">
                <div><strong>Cliente:</strong> ${conduce.cliente.nombre}</div>
                <div><strong>Fecha:</strong> ${new Date(conduce.fechaCreacion).toLocaleDateString()}</div>
                <div><strong>Total:</strong> $${conduce.total.toFixed(2)}</div>
                <div><strong>Productos:</strong> ${conduce.productos.length} items</div>
            </div>
            <div class="conduce-productos">
                ${conduce.productos.map(p => `${p.cantidad}x ${p.descripcion} - $${p.total.toFixed(2)}`).join('<br>')}
            </div>
            <div class="conduce-actions">
                <button class="btn-info btn-sm" onclick="verConducePDF('${conduce._id}')">
                    📄 Ver PDF
                </button>
                ${conduce.estado === 'pendiente' ? `
                    <button class="btn-danger btn-sm" onclick="anularConduce('${conduce._id}')">
                        ❌ Anular
                    </button>
                ` : ''}
            </div>
        </div>
    `).join('');
}

// Actualizar filtros de clientes
function updateClientFilters(clientes) {
    const clientesCredito = clientes.filter(c => c.creditoHabilitado);
    
    // Filtro en la pestaña de créditos
    const filtroCliente = document.getElementById('filtro-cliente-credito');
    if (filtroCliente) {
        filtroCliente.innerHTML = '<option value="">Todos los clientes</option>' +
            clientesCredito.map(cliente => 
                `<option value="${cliente._id}">${cliente.nombre}</option>`
            ).join('');
    }
    
    // Selector en modal de conduce
    const selectConduce = document.getElementById('conduce-cliente');
    if (selectConduce) {
        selectConduce.innerHTML = '<option value="">Seleccione un cliente</option>' +
            clientesCredito.map(cliente => 
                `<option value="${cliente._id}">${cliente.nombre}</option>`
            ).join('');
    }
    
    // Selector en modal de pago
    const selectPago = document.getElementById('pago-cliente');
    if (selectPago) {
        selectPago.innerHTML = '<option value="">Seleccione un cliente</option>' +
            clientesCredito.map(cliente => 
                `<option value="${cliente._id}">${cliente.nombre}</option>`
            ).join('');
    }
}

// Filtrar créditos
function filtrarCreditos() {
    const estadoFiltro = document.getElementById('filtro-estado-credito').value;
    const clienteFiltro = document.getElementById('filtro-cliente-credito').value;
    
    let conducesFiltered = [...(state.conduces || [])];
    
    if (estadoFiltro) {
        conducesFiltered = conducesFiltered.filter(c => c.estado === estadoFiltro);
    }
    
    if (clienteFiltro) {
        conducesFiltered = conducesFiltered.filter(c => c.cliente._id === clienteFiltro);
    }
    
    renderConducesList(conducesFiltered);
}

// Ver conduce en PDF
function verConducePDF(conduceId) {
    window.open(`${API_BASE}/conduces/${conduceId}/pdf`, '_blank');
}

// Anular conduce
async function anularConduce(conduceId) {
    const motivo = prompt('Motivo de anulación:');
    if (!motivo) return;
    
    try {
        showLoading(true);
        const response = await fetch(`${API_BASE}/conduces/${conduceId}/anular`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ motivo })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al anular conduce');
        }
        
        showNotification('Conduce anulado exitosamente', 'success');
        await loadCreditos();
        
    } catch (error) {
        console.error('Error anulando conduce:', error);
        showNotification(error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Configurar modal de conduce
async function setupConduceModal() {
    try {
        console.log('Iniciando configuración de modal de conduce...');
        console.log('Estado actual de clientes:', state.clientes?.length || 0);
        
        // Asegurar que tenemos los clientes cargados
        if (!state.clientes || state.clientes.length === 0) {
            console.log('Cargando clientes...');
            await cargarClientes();
        }
        
        // Cargar clientes con crédito habilitado
        const clientesCredito = state.clientes.filter(c => c.creditoHabilitado);
        console.log('Clientes con crédito encontrados:', clientesCredito.length);
        
        const selectCliente = document.getElementById('conduce-cliente');
        console.log('Elemento select encontrado:', !!selectCliente);
        
        if (selectCliente) {
            selectCliente.innerHTML = '<option value="">Seleccione un cliente</option>' +
                clientesCredito.map(cliente => 
                    `<option value="${cliente._id}">${cliente.nombre}</option>`
                ).join('');
            console.log('Opciones agregadas al select');
        }
        
        // Inicializar cálculos
        calcularTotalConduce();
        
        console.log('Modal de conduce configurado con', clientesCredito.length, 'clientes con crédito');
    } catch (error) {
        console.error('Error configurando modal de conduce:', error);
        showNotification('Error cargando clientes', 'error');
    }
}

// Configurar modal de pagar créditos
async function setupPagarCreditosModal() {
    try {
        // Asegurar que tenemos los clientes cargados
        if (!state.clientes || state.clientes.length === 0) {
            await cargarClientes();
        }
        // Cargar clientes con crédito habilitado
        const clientesCredito = state.clientes.filter(c => c.creditoHabilitado);
        const selectCliente = document.getElementById('pago-cliente');
        if (selectCliente) {
            selectCliente.innerHTML = '<option value="">Seleccione un cliente</option>' +
                clientesCredito.map(cliente => 
                    `<option value="${cliente._id}">${cliente.nombre}</option>`
                ).join('');
        }
        // Resetear campos de conduces y resumen
        const conducesContainer = document.getElementById('conduces-pendientes');
        if (conducesContainer) conducesContainer.classList.add('hidden');
        const conducesList = document.getElementById('conduces-list-pago');
        if (conducesList) conducesList.innerHTML = '';
        document.getElementById('conduces-seleccionados-count').textContent = '0';
        document.getElementById('total-pagar').textContent = '$0.00';
        const btn = document.getElementById('btn-pagar-creditos');
        if (btn) btn.disabled = true;
    } catch (error) {
        console.error('Error configurando modal de pago:', error);
        showNotification('Error cargando clientes', 'error');
    }
}
