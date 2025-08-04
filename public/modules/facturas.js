/**
 * Módulo de Facturas
 * Gestión de facturas fiscales y no fiscales
 */

// Variable para contador de productos en factura
let contadorProductosFactura = 1;

// Función para cargar facturas
async function cargarFacturas() {
    try {
        const fechaParam = window.StateModule.state.fechaSeleccionada || window.StateModule.getLocalDateString();
        console.log('🔵 Cargando facturas para fecha:', fechaParam);
        
        window.APIModule.showLoading(true);
        
        const response = await fetch(`${window.APIModule.API_BASE}/facturas?fecha=${fechaParam}`);
        
        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        
        const facturas = await response.json();
        console.log('📄 Facturas cargadas:', facturas.length);
        
        window.StateModule.state.facturas = facturas;
        updateFacturasView();
        
    } catch (error) {
        console.error('❌ Error cargando facturas:', error);
        window.notify.error(`Error cargando facturas: ${error.message}`);
    } finally {
        window.APIModule.showLoading(false);
    }
}

// Función para actualizar vista de facturas
function updateFacturasView() {
    const container = document.getElementById('facturas-list');
    if (!container) return;

    const facturas = window.StateModule.state.facturas || [];
    
    if (facturas.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📄</div>
                <h3>No hay facturas</h3>
                <p>No se encontraron facturas para esta fecha.</p>
            </div>
        `;
        return;
    }

    // Calcular totales
    const totalFacturado = facturas.reduce((sum, factura) => sum + (factura.total || 0), 0);
    
    container.innerHTML = `
        <div class="facturas-summary">
            <div class="summary-card">
                <div class="summary-value">${window.APIModule.formatCurrency(totalFacturado)}</div>
                <div class="summary-label">Total Facturado</div>
            </div>
            <div class="summary-card">
                <div class="summary-value">${facturas.length}</div>
                <div class="summary-label">Facturas Generadas</div>
            </div>
        </div>
        
        <div class="facturas-items">
            ${facturas.map(factura => createFacturaCard(factura)).join('')}
        </div>
    `;
}

// Función para crear tarjeta de factura
function createFacturaCard(factura) {
    const fecha = factura.fechaEmision ? new Date(factura.fechaEmision) : new Date(factura.fecha);
    const fechaStr = fecha.toLocaleString('es-CO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    return `
        <div class="factura-card">
            <div class="factura-info">
                <h4>Factura #${factura.numero || factura._id}</h4>
                <div class="factura-meta">
                    <span class="factura-fecha">${fechaStr}</span>
                    ${factura.esComprobanteFiscal || factura.tipo === 'fiscal' ? '<span class="badge fiscal">Fiscal</span>' : '<span class="badge no-fiscal">No Fiscal</span>'}
                </div>
            </div>
            
            <div class="factura-total">${window.APIModule.formatCurrency(factura.total)}</div>
            
            <div class="factura-cliente">
                <strong>Cliente:</strong> ${factura.cliente?.nombre || factura.clienteNombre || 'Cliente General'}
                ${(factura.cliente?.telefono || factura.clienteTelefono) ? `<br><strong>Teléfono:</strong> ${factura.cliente?.telefono || factura.clienteTelefono}` : ''}
            </div>
            
            <div class="factura-productos">
                ${factura.productos.map(producto => `
                    <div class="producto-line">
                        ${producto.cantidad}x ${producto.descripcion} - ${window.APIModule.formatCurrency(producto.total)}
                    </div>
                `).join('')}
            </div>
            
            <div class="factura-actions">
                <button class="btn-action" onclick="verFacturaPDF('${factura._id}')" title="Ver PDF">
                    📄 PDF
                </button>
                <button class="btn-action" onclick="compartirFactura(${JSON.stringify(factura).replace(/"/g, '&quot;')})" title="Compartir PDF">
                    📤 Compartir
                </button>
            </div>
        </div>
    `;
}

// Función para configurar modal de factura
function setupFacturaModal() {
    // Resetear contador
    contadorProductosFactura = 1;
    
    // Cargar clientes en el select
    const clienteSelect = document.getElementById('factura-cliente');
    if (clienteSelect && window.StateModule.state.clientes) {
        clienteSelect.innerHTML = '<option value="">Seleccionar cliente...</option>' +
            window.StateModule.state.clientes.map(cliente => 
                `<option value="${cliente._id}">${cliente.nombre} - ${cliente.telefono}</option>`
            ).join('');
    }
    
    // Configurar eventos de cálculo en el primer producto
    const primerProducto = document.querySelector('.producto-item');
    if (primerProducto) {
        setupProductoCalculation(primerProducto);
    }
    
    // Configurar botón de agregar producto
    const btnAgregarProducto = document.getElementById('btn-agregar-producto');
    if (btnAgregarProducto) {
        btnAgregarProducto.onclick = agregarProductoFactura;
    }
    
    // Configurar event listeners para cálculos
    setupFacturaEventListeners();
    
    // Realizar cálculo inicial
    setTimeout(() => {
        calcularTotalFactura();
    }, 100);
}

// Función para configurar cálculos de producto
function setupProductoCalculation(productoElement) {
    const cantidadInput = productoElement.querySelector('.producto-cantidad');
    const precioInput = productoElement.querySelector('.producto-precio');
    const totalInput = productoElement.querySelector('.producto-total');
    
    function calcular() {
        const cantidad = parseFloat(cantidadInput.value) || 0;
        const precio = parseFloat(precioInput.value) || 0;
        const total = cantidad * precio;
        
        // Validar el cálculo antes de asignar
        if (!isNaN(total) && isFinite(total)) {
            totalInput.value = total.toFixed(2);
        } else {
            totalInput.value = '0.00';
        }
        
        calcularTotalFactura();
    }
    
    // Agregar validación en tiempo real
    cantidadInput.addEventListener('input', (e) => {
        let value = parseFloat(e.target.value);
        if (isNaN(value) || value < 0) {
            e.target.value = '';
        }
        calcular();
    });
    
    precioInput.addEventListener('input', (e) => {
        let value = parseFloat(e.target.value);
        if (isNaN(value) || value < 0) {
            e.target.value = '';
        }
        calcular();
    });
}

// Función para agregar producto a factura
function agregarProductoFactura() {
    contadorProductosFactura++;
    const productosContainer = document.getElementById('productos-container');
    
    const nuevoProducto = document.createElement('div');
    nuevoProducto.className = 'producto-item';
    nuevoProducto.innerHTML = `
        <div class="form-row">
            <div class="form-group">
                <label class="form-group-mobile-label">Descripción</label>
                <input type="text" placeholder="Descripción *" class="producto-descripcion" required>
            </div>
            <div class="form-group">
                <label class="form-group-mobile-label">Cantidad</label>
                <input type="number" placeholder="Cant." class="producto-cantidad" min="1" value="1" required>
            </div>
            <div class="form-group">
                <label class="form-group-mobile-label">Precio</label>
                <input type="number" placeholder="Precio" class="producto-precio" step="0.01" min="0" required>
            </div>
            <div class="form-group">
                <label class="form-group-mobile-label">Total</label>
                <input type="number" placeholder="Total" class="producto-total" readonly>
            </div>
            <button type="button" class="btn-remove-producto" onclick="removerProductoFactura(this)">🗑️</button>
        </div>
    `;
    
    productosContainer.appendChild(nuevoProducto);
    setupProductoCalculation(nuevoProducto);
    
    // Enfocar en la descripción del nuevo producto
    nuevoProducto.querySelector('.producto-descripcion').focus();
}

// Función para remover producto de factura
function removerProductoFactura(boton) {
    if (document.querySelectorAll('.producto-item').length > 1) {
        boton.closest('.producto-item').remove();
        calcularTotalFactura();
    } else {
        window.notify.warning('Debe haber al menos un producto en la factura');
    }
}

// Función para calcular total de factura
function calcularTotalFactura() {
    let subtotalBruto = 0;
    
    document.querySelectorAll('.producto-item').forEach(item => {
        const cantidadInput = item.querySelector('.producto-cantidad');
        const precioInput = item.querySelector('.producto-precio');
        const totalInput = item.querySelector('.producto-total');
        
        const cantidad = parseFloat(cantidadInput.value) || 0;
        const precio = parseFloat(precioInput.value) || 0;
        const totalProducto = cantidad * precio;
        
        // Validar el cálculo
        if (!isNaN(totalProducto) && isFinite(totalProducto)) {
            totalInput.value = totalProducto.toFixed(2);
            subtotalBruto += totalProducto;
        } else {
            totalInput.value = '0.00';
            console.warn('⚠️ Cálculo inválido para producto:', { cantidad, precio });
        }
    });
    
    // Aplicar descuento si existe
    const descuentoInput = document.getElementById('factura-descuento');
    const descuento = parseFloat(descuentoInput?.value) || 0;
    const subtotalNeto = Math.max(0, subtotalBruto - descuento);
    
    // Calcular ITBIS solo si está marcado como comprobante fiscal
    const esComprobanteFiscal = document.getElementById('factura-comprobante-fiscal')?.checked || false;
    const itbis = esComprobanteFiscal ? subtotalNeto * 0.18 : 0;
    const totalFinal = subtotalNeto + itbis;
    
    console.log('💰 Cálculos:', {
        subtotalBruto: subtotalBruto,
        descuento: descuento,
        subtotalNeto: subtotalNeto,
        esComprobanteFiscal: esComprobanteFiscal,
        itbis: itbis,
        totalFinal: totalFinal
    });
    
    // Función para actualizar elementos del DOM de forma segura
    const updateElementSafe = (id, value) => {
        const element = document.getElementById(id);
        if (element && !isNaN(value) && isFinite(value)) {
            element.textContent = window.APIModule.formatCurrency(value);
            console.log(`Actualizando ${id}:`, window.APIModule.formatCurrency(value));
        } else if (element) {
            console.warn(`⚠️ No se pudo actualizar ${id}, valor inválido:`, value);
        } else {
            console.warn(`⚠️ Elemento ${id} no encontrado en el DOM`);
        }
    };

    // Actualizar vista con valores calculados
    updateElementSafe('factura-subtotal', subtotalNeto);
    updateElementSafe('factura-impuesto', itbis);
    updateElementSafe('factura-descuento-display', descuento);
    updateElementSafe('factura-total', totalFinal);
    
    // También actualizar elementos alternativos si existen
    updateElementSafe('subtotal-value', subtotalNeto);
    updateElementSafe('itbis-value', itbis);
    updateElementSafe('total-value', totalFinal);
}

// Función para generar factura (manejador de eventos del formulario)
async function generarFactura(event) {
    event.preventDefault();
    await submitFactura();
}

// Función para enviar factura
async function submitFactura() {
    try {
        // Validar productos
        const productos = [];
        let hayProductosValidos = false;
        
        document.querySelectorAll('.producto-item').forEach(item => {
            const descripcion = item.querySelector('.producto-descripcion').value.trim();
            const cantidad = parseFloat(item.querySelector('.producto-cantidad').value) || 0;
            const precio = parseFloat(item.querySelector('.producto-precio').value) || 0;
            
            if (descripcion && cantidad > 0 && precio > 0) {
                const totalProducto = cantidad * precio;
                
                // Validar que el total no sea NaN
                if (!isNaN(totalProducto) && isFinite(totalProducto)) {
                    productos.push({
                        descripcion,
                        cantidad: Number(cantidad),
                        precioUnitario: Number(precio), // Backend espera precioUnitario
                        total: Number(totalProducto.toFixed(2))
                    });
                    hayProductosValidos = true;
                } else {
                    console.error('❌ Total inválido para producto:', { descripcion, cantidad, precio, totalProducto });
                }
            }
        });
        
        if (!hayProductosValidos) {
            window.notify.warning('Debe agregar al menos un producto válido');
            return;
        }
        
        // Calcular totales con validación rigurosa
        const subtotalCalculado = productos.reduce((sum, p) => sum + p.total, 0);
        const descuentoValor = parseFloat(document.getElementById('factura-descuento')?.value) || 0;
        const totalCalculado = subtotalCalculado - descuentoValor;
        
        // Validar que los totales no sean NaN
        if (isNaN(subtotalCalculado) || !isFinite(subtotalCalculado)) {
            console.error('❌ Subtotal inválido:', subtotalCalculado, 'Productos:', productos);
            window.notify.error('Error en el cálculo del subtotal');
            return;
        }
        
        if (isNaN(totalCalculado) || !isFinite(totalCalculado)) {
            console.error('❌ Total inválido:', totalCalculado, 'Subtotal:', subtotalCalculado, 'Descuento:', descuentoValor);
            window.notify.error('Error en el cálculo del total');
            return;
        }
        
        if (totalCalculado <= 0) {
            window.notify.warning('El total de la factura debe ser mayor a cero');
            return;
        }
        
        console.log('💰 Cálculos validados:', {
            subtotal: subtotalCalculado,
            descuento: descuentoValor,
            total: totalCalculado,
            productos: productos.length
        });
        
        // Obtener datos del cliente seleccionado
        const clienteId = document.getElementById('factura-cliente').value;
        
        // Verificar elementos del formulario
        const tipoSelect = document.getElementById('factura-tipo');
        const fiscalCheckbox = document.getElementById('factura-comprobante-fiscal');
        
        console.log('🔍 Elementos del formulario:', {
            clienteId: clienteId,
            tipoSelect: tipoSelect?.value,
            fiscalCheckbox: fiscalCheckbox?.checked,
            clientesDisponibles: window.StateModule.state.clientes?.length || 0
        });
        
        let clienteData = null;
        
        if (clienteId && window.StateModule.state.clientes) {
            const clienteSeleccionado = window.StateModule.state.clientes.find(c => c._id === clienteId);
            if (clienteSeleccionado) {
                clienteData = {
                    _id: clienteSeleccionado._id,
                    nombre: clienteSeleccionado.nombre,
                    telefono: clienteSeleccionado.telefono,
                    direccion: clienteSeleccionado.direccion,
                    cedula: clienteSeleccionado.cedula,
                    rnc: clienteSeleccionado.rnc
                };
            }
        }

        // Preparar datos simplificados (el backend calculará totales)
        const facturaData = {
            clienteId: clienteId,
            productos: productos,
            esComprobanteFiscal: document.getElementById('factura-comprobante-fiscal')?.checked || false,
            metodoPago: 'efectivo',
            tipoComprobante: document.getElementById('factura-tipo')?.value || 'BOLETA',
            requiereRNC: document.getElementById('factura-comprobante-fiscal')?.checked || false
        };
        
        console.log('📋 Datos de la factura a enviar:', facturaData);
        
        window.APIModule.showLoading(true);
        
        const response = await fetch(`${window.APIModule.API_BASE}/facturas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(facturaData)
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('❌ Error del servidor:', errorData);
            throw new Error(errorData.error || errorData.message || `Error ${response.status}: ${response.statusText}`);
        }
        
        const facturaGenerada = await response.json();
        console.log('✅ Factura generada exitosamente:', facturaGenerada);
        
        // Actualizar estado y vista
        if (!window.StateModule.state.facturas) {
            window.StateModule.state.facturas = [];
        }
        window.StateModule.state.facturas.unshift(facturaGenerada);
        updateFacturasView();
        
        // Mostrar modal de éxito
        if (window.ModalesModule) {
            window.ModalesModule.mostrarModalExitoFactura(facturaGenerada);
        } else {
            window.closeModal();
            window.notify.success('Factura generada exitosamente');
        }
        
        // Actualizar datos del día
        if (window.APIModule.loadInitialData) {
            window.APIModule.loadInitialData();
        }
        
    } catch (error) {
        console.error('Error generando factura:', error);
        window.notify.error(`Error al generar factura: ${error.message}`);
    } finally {
        window.APIModule.showLoading(false);
    }
}

// Función para ver PDF de factura
async function verFacturaPDF(facturaId) {
    try {
        window.APIModule.showLoading(true);
        
        const response = await fetch(`${window.APIModule.API_BASE}/facturas/${facturaId}/pdf`);
        
        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        
        // Abrir en nueva pestaña
        window.open(url, '_blank');
        
    } catch (error) {
        console.error('Error descargando PDF:', error);
        window.notify.error(`Error al generar PDF: ${error.message}`);
    } finally {
        window.APIModule.showLoading(false);
    }
}

// Función para descargar PDF de factura
async function descargarFacturaPDF(facturaId) {
    try {
        window.APIModule.showLoading(true);
        
        const response = await fetch(`${window.APIModule.API_BASE}/facturas/${facturaId}/pdf`);
        
        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        
        // Crear link de descarga
        const a = document.createElement('a');
        a.href = url;
        a.download = `factura-${facturaId}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
        
        window.notify.success('PDF descargado exitosamente');
        
    } catch (error) {
        console.error('Error descargando PDF:', error);
        window.notify.error(`Error al descargar PDF: ${error.message}`);
    } finally {
        window.APIModule.showLoading(false);
    }
}

// Función para convertir orden a factura
async function convertirOrdenAFactura(ordenId) {
    try {
        const confirmacion = await window.elegantConfirm(
            '¿Está seguro que desea convertir esta orden en factura?',
            'Convertir a Factura'
        );
        
        if (!confirmacion) return;
        
        window.APIModule.showLoading(true);
        
        const response = await fetch(`${window.APIModule.API_BASE}/ordenes/${ordenId}/convertir-factura`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
        }
        
        const resultado = await response.json();
        
        // Actualizar estados
        if (window.StateModule.state.facturas) {
            window.StateModule.state.facturas.unshift(resultado.factura);
            updateFacturasView();
        }
        
        if (window.StateModule.state.ordenes && window.OrdenesModule) {
            window.StateModule.state.ordenes = window.StateModule.state.ordenes.filter(o => o._id !== ordenId);
            window.OrdenesModule.updateOrdenesView();
        }
        
        window.notify.success('Orden convertida a factura exitosamente');
        
        // Mostrar modal de éxito de la factura generada
        if (window.ModalesModule) {
            window.ModalesModule.mostrarModalExitoFactura(resultado.factura);
        }
        
        // Actualizar datos del día
        if (window.APIModule.loadInitialData) {
            window.APIModule.loadInitialData();
        }
        
    } catch (error) {
        console.error('Error convirtiendo orden a factura:', error);
        window.notify.error(`Error al convertir orden: ${error.message}`);
    } finally {
        window.APIModule.showLoading(false);
    }
}

// Función para compartir factura
async function compartirFactura(factura) {
    try {
        window.APIModule.showLoading(true);
        
        const response = await fetch(`${window.APIModule.API_BASE}/facturas/${factura._id}/pdf`);
        
        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        
        const blob = await response.blob();
        
        // Verificar si el navegador soporta Web Share API
        if (navigator.share && navigator.canShare) {
            // Crear un archivo para compartir
            const file = new File([blob], `factura-${factura.numero || factura._id}.pdf`, {
                type: 'application/pdf'
            });
            
            // Verificar si se puede compartir archivos
            if (navigator.canShare({ files: [file] })) {
                await navigator.share({
                    title: `Factura #${factura.numero || factura._id}`,
                    text: `Factura de ${factura.cliente?.nombre || factura.clienteNombre || 'Cliente General'} - Total: ${window.APIModule.formatCurrency(factura.total)}`,
                    files: [file]
                });
                
                window.notify.success('Factura compartida exitosamente');
                return;
            }
        }
        
        // Fallback: descargar el PDF si no se puede compartir
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `factura-${factura.numero || factura._id}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        window.notify.info('PDF descargado. Puedes compartirlo manualmente desde tu carpeta de descargas.');
        
    } catch (error) {
        console.error('Error compartiendo factura:', error);
        window.notify.error(`Error al compartir factura: ${error.message}`);
    } finally {
        window.APIModule.showLoading(false);
    }
}

// Event listeners para el modal de factura
function setupFacturaEventListeners() {
    // Event listener para descuento
    document.addEventListener('input', (e) => {
        if (e.target.id === 'factura-descuento') {
            calcularTotalFactura();
        }
    });
    
    // Event listener para comprobante fiscal (para recalcular ITBIS)
    document.addEventListener('change', (e) => {
        if (e.target.id === 'factura-comprobante-fiscal') {
            console.log('📋 Comprobante fiscal cambió:', e.target.checked);
            calcularTotalFactura();
        }
    });
}

// Exportar funciones del módulo
window.FacturasModule = {
    cargarFacturas,
    updateFacturasView,
    setupFacturaModal,
    setupProductoCalculation,
    agregarProductoFactura,
    removerProductoFactura,
    calcularTotalFactura,
    calcularTotalesFactura: calcularTotalFactura, // Alias para compatibilidad
    generarFactura,
    submitFactura,
    verFacturaPDF,
    descargarFacturaPDF,
    compartirFactura,
    convertirOrdenAFactura,
    setupFacturaEventListeners
};

// Exponer funciones globalmente para compatibilidad
window.cargarFacturas = cargarFacturas;
window.generarFactura = generarFactura;
window.submitFactura = submitFactura;
window.verFacturaPDF = verFacturaPDF;
window.descargarFacturaPDF = descargarFacturaPDF;
window.compartirFactura = compartirFactura;
window.convertirOrdenAFactura = convertirOrdenAFactura;
window.agregarProductoFactura = agregarProductoFactura;
window.agregarProducto = agregarProductoFactura; // Alias para compatibilidad
window.removerProductoFactura = removerProductoFactura;
window.calcularTotalFactura = calcularTotalFactura;
window.calcularTotalesFactura = calcularTotalFactura; // Alias para compatibilidad
