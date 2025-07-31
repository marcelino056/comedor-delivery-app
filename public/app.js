// Estado global de la aplicación
let state = {
    ventas: [],
    ordenes: [],
    gastos: [],
    montoInicial: {},
    activeTab: 'ventas',
    filtroEstado: 'todos',
    ws: null,
    ventaActual: 0,
    historialVisible: false
};

// Configuración
const API_BASE = window.location.origin + '/api';
const WS_URL = `ws://${window.location.hostname}:3006`;

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
    const fecha = new Date().toLocaleDateString('es-CO', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    fechaElement.textContent = fecha;
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
    showLoading(true);
    try {
        const [ventasRes, ordenesRes, gastosRes] = await Promise.all([
            fetch(`${API_BASE}/ventas`),
            fetch(`${API_BASE}/ordenes`),
            fetch(`${API_BASE}/gastos`)
        ]);

        state.ventas = await ventasRes.json();
        state.ordenes = await ordenesRes.json();
        state.gastos = await gastosRes.json();

        // Cargar monto inicial del día actual
        const hoy = new Date().toISOString().split('T')[0];
        const montoRes = await fetch(`${API_BASE}/monto-inicial/${hoy}`);
        const montoData = await montoRes.json();
        state.montoInicial[hoy] = montoData.monto;

    } catch (error) {
        console.error('Error cargando datos:', error);
    } finally {
        showLoading(false);
    }
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
    }

    modal.classList.remove('hidden');
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
    
    // Inicializar el display de venta
    actualizarDisplayVenta();
}

function updateVentasView() {
    const container = document.getElementById('ventas-list');
    const ventasRecientes = state.ventas.slice(0, 10);

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
                        ${!venta.anulada ? `
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
                    ${!orden.anulada ? `
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
                        ${!orden.anulada ? `
                            <button class="delete-btn" onclick="anularOrden(${orden.id})" title="Anular orden">
                                🗑️
                            </button>
                        ` : ''}
                    </div>
                    ${!orden.anulada ? `
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
    const hoy = new Date().toDateString();
    const gastosHoy = state.gastos.filter(g => 
        new Date(g.timestamp).toDateString() === hoy
    ).slice(0, 10);

    const container = document.getElementById('gastos-list');
    
    if (gastosHoy.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 1rem;">No hay gastos registrados hoy</p>';
        return;
    }

    container.innerHTML = gastosHoy.map(gasto => `
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
    const hoy = new Date().toDateString();
    
    const ventasHoy = state.ventas.filter(v => 
        new Date(v.timestamp).toDateString() === hoy && !v.anulada
    );
    
    const gastosHoy = state.gastos.filter(g => 
        new Date(g.timestamp).toDateString() === hoy
    );

    const ordenesHoy = state.ordenes.filter(o => 
        new Date(o.timestamp).toDateString() === hoy && !o.anulada
    );

    const totalVentasLocal = ventasHoy.reduce((sum, venta) => sum + venta.monto, 0);
    const totalVentasDelivery = ordenesHoy.reduce((sum, orden) => sum + orden.total, 0);
    const totalVentas = totalVentasLocal + totalVentasDelivery;
    const totalGastos = gastosHoy.reduce((sum, gasto) => sum + gasto.monto, 0);
    const totalTransacciones = ventasHoy.length + ordenesHoy.length;
    
    // Calcular ventas por método de pago
    const ventasEfectivo = ventasHoy
        .filter(item => item.metodoPago === 'efectivo')
        .reduce((sum, item) => sum + item.monto, 0) +
        ordenesHoy
        .filter(item => item.metodoPago === 'efectivo')
        .reduce((sum, item) => sum + item.total, 0);
    
    const ventasTarjeta = ventasHoy
        .filter(item => item.metodoPago === 'tarjeta')
        .reduce((sum, item) => sum + item.monto, 0) +
        ordenesHoy
        .filter(item => item.metodoPago === 'tarjeta')
        .reduce((sum, item) => sum + item.total, 0);
    
    const ventasTransferencia = ventasHoy
        .filter(item => item.metodoPago === 'transferencia')
        .reduce((sum, item) => sum + item.monto, 0) +
        ordenesHoy
        .filter(item => item.metodoPago === 'transferencia')
        .reduce((sum, item) => sum + item.total, 0);
    
    // Monto inicial del día
    const fechaHoy = new Date().toISOString().split('T')[0];
    const montoInicial = state.montoInicial[fechaHoy] || 0;
    
    // Efectivo esperado en caja
    const efectivoEsperado = montoInicial + ventasEfectivo - totalGastos;

    return {
        totalVentas,
        totalGastos,
        totalTransacciones,
        ganancia: totalVentas - totalGastos,
        ventasLocales: ventasHoy.length,
        delivery: ordenesHoy.length,
        montoInicial,
        ventasEfectivo,
        ventasTarjeta,
        ventasTransferencia,
        efectivoEsperado
    };
}

// Utilidades
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
