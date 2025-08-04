/**
 * Módulo de Modales
 * Manejo de modales y formularios
 */

// Función para abrir modal
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
            setTimeout(() => {
                if (window.ConfiguracionModule) {
                    window.ConfiguracionModule.updateConfiguracionesRNCView();
                }
            }, 100);
            break;
        case 'reporte-rnc':
            title.textContent = 'Generar Reporte RNC';
            body.innerHTML = getTemplateContent('template-reporte-rnc-modal');
            break;
        case 'conduce':
            title.textContent = 'Nuevo Conduce a Crédito';
            body.innerHTML = getTemplateContent('template-conduce-modal');
            modal.style.display = 'block';
            modal.classList.add('show');
            setTimeout(() => {
                if (window.CreditosModule) {
                    window.CreditosModule.setupConduceModal();
                }
            }, 500);
            break;
        case 'pagar-creditos':
            title.textContent = 'Pagar Créditos';
            body.innerHTML = getTemplateContent('template-pagar-creditos-modal');
            modal.style.display = 'block';
            modal.classList.add('show');
            setTimeout(() => {
                if (window.CreditosModule) {
                    window.CreditosModule.setupPagarCreditosModal();
                }
            }, 500);
            break;
        case 'configuracion-empresa':
            title.textContent = 'Configuración de la Empresa';
            body.innerHTML = getTemplateContent('template-configuracion-empresa-modal');
            setTimeout(() => {
                if (window.ConfiguracionModule) {
                    window.ConfiguracionModule.setupConfiguracionEmpresaModal();
                }
            }, 100);
            break;
    }

    // Asegurar que el modal se muestre correctamente
    modal.style.display = 'block';
    modal.classList.remove('hidden');
    modal.classList.add('show');
}

// Función para cerrar modal
function closeModal() {
    console.log('closeModal ejecutándose...');
    const modal = document.getElementById('modal');
    console.log('Modal encontrado:', !!modal);
    console.log('Clases antes del cierre:', modal?.classList.toString());
    
    modal.classList.add('hidden');
    modal.classList.remove('show');
    modal.style.display = 'none';
    
    console.log('Clases después del cierre:', modal?.classList.toString());
    console.log('Display después del cierre:', modal?.style.display);
}

// Función para obtener contenido de template
function getTemplateContent(templateId) {
    const template = document.getElementById(templateId);
    return template ? template.innerHTML : '';
}

// Función para configurar modal de factura
function setupFacturaModal() {
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
    if (primerProducto && window.FacturasModule) {
        window.FacturasModule.setupProductoCalculation(primerProducto);
    }
}

// Contenido de modales simples
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
                <option value="credito">Crédito</option>
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

// Modales de éxito
function mostrarModalExitoFactura(factura) {
    const modal = document.getElementById('modal');
    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');
    
    title.textContent = '✅ Factura Generada';
    body.innerHTML = getTemplateContent('template-exito-factura-modal');
    
    // Configurar datos de la factura
    document.getElementById('factura-numero').textContent = factura.numero || factura._id;
    document.getElementById('factura-total').textContent = window.APIModule.formatCurrency(factura.total);
    
    // Configurar eventos de botones
    document.getElementById('btn-descargar-pdf').onclick = () => {
        if (window.FacturasModule) {
            window.FacturasModule.descargarFacturaPDF(factura._id);
        }
        closeModal();
    };
    
    document.getElementById('btn-compartir').onclick = () => {
        compartirFactura(factura);
    };
    
    document.getElementById('btn-cerrar-exito').onclick = () => {
        closeModal();
    };
    
    modal.classList.remove('hidden');
}

function mostrarModalExitoConduce(conduce) {
    const modal = document.getElementById('modal');
    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');
    
    title.textContent = '✅ Conduce Generado';
    body.innerHTML = getTemplateContent('template-exito-conduce-modal');
    
    // Configurar datos del conduce
    document.getElementById('conduce-numero').textContent = conduce.numero || conduce._id;
    document.getElementById('conduce-total-modal').textContent = window.APIModule.formatCurrency(conduce.total);
    
    // Configurar eventos de botones
    document.getElementById('btn-descargar-conduce-pdf').onclick = () => {
        if (window.CreditosModule) {
            window.CreditosModule.verConducePDF(conduce._id);
        }
        closeModal();
    };
    
    document.getElementById('btn-compartir-conduce').onclick = () => {
        compartirConduce(conduce);
    };
    
    document.getElementById('btn-cerrar-exito-conduce').onclick = () => {
        closeModal();
    };
    
    modal.classList.remove('hidden');
}

// Funciones de compartir
async function compartirFactura(factura) {
    try {
        const facturaTexto = `Factura #${factura.numero || factura._id}\nTotal: ${window.APIModule.formatCurrency(factura.total)}\n\nGenerada en: ${new Date().toLocaleString('es-CO')}`;
        
        if (navigator.share) {
            await navigator.share({
                title: 'Factura Generada',
                text: facturaTexto,
                url: window.location.href
            });
        } else {
            if (navigator.clipboard) {
                await navigator.clipboard.writeText(facturaTexto);
                window.notify.success('Información de la factura copiada al portapapeles');
            } else {
                const textArea = document.createElement('textarea');
                textArea.value = facturaTexto;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                window.notify.success('Información de la factura copiada al portapapeles');
            }
        }
    } catch (error) {
        console.error('Error al compartir:', error);
        window.notify.error('Error al compartir la factura');
    }
}

async function compartirConduce(conduce) {
    try {
        const conduceTexto = `Conduce a Crédito #${conduce.numero || conduce._id}\nTotal: ${window.APIModule.formatCurrency(conduce.total)}\nCliente: ${conduce.cliente?.nombre || 'N/A'}\n\nGenerado en: ${new Date().toLocaleString('es-CO')}`;
        
        if (navigator.share) {
            await navigator.share({
                title: 'Conduce a Crédito Generado',
                text: conduceTexto,
                url: window.location.href
            });
        } else {
            if (navigator.clipboard) {
                await navigator.clipboard.writeText(conduceTexto);
                window.notify.success('Información del conduce copiada al portapapeles');
            } else {
                const textArea = document.createElement('textarea');
                textArea.value = conduceTexto;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                window.notify.success('Información del conduce copiada al portapapeles');
            }
        }
    } catch (error) {
        console.error('Error al compartir:', error);
        window.notify.error('Error al compartir el conduce');
    }
}

// Actualizaciones en tiempo real de los formularios
function setupModalEventListeners() {
    document.addEventListener('input', (e) => {
        if (e.target.id === 'venta-monto') {
            const total = parseFloat(e.target.value) || 0;
            document.getElementById('venta-total').textContent = window.APIModule.formatCurrency(total);
        }
        
        if (e.target.id === 'orden-monto' || e.target.id === 'orden-delivery') {
            const monto = parseFloat(document.getElementById('orden-monto')?.value) || 0;
            const delivery = parseFloat(document.getElementById('orden-delivery')?.value) || 0;
            const total = monto + delivery;
            
            if (document.getElementById('orden-monto-display')) {
                document.getElementById('orden-monto-display').textContent = window.APIModule.formatCurrency(monto);
            }
            if (document.getElementById('orden-delivery-display')) {
                document.getElementById('orden-delivery-display').textContent = window.APIModule.formatCurrency(delivery);
            }
            if (document.getElementById('orden-total')) {
                document.getElementById('orden-total').textContent = window.APIModule.formatCurrency(total);
            }
        }
        
        if (e.target.id === 'monto-inicial') {
            const monto = parseFloat(e.target.value) || 0;
            document.getElementById('monto-inicial-display').textContent = window.APIModule.formatCurrency(monto);
        }
    });
}

// Exportar funciones del módulo
window.ModalesModule = {
    openModal,
    closeModal,
    getTemplateContent,
    setupFacturaModal,
    mostrarModalExitoFactura,
    mostrarModalExitoConduce,
    compartirFactura,
    compartirConduce,
    setupModalEventListeners
};

// Exponer funciones globalmente para compatibilidad
window.openModal = openModal;
window.closeModal = closeModal;
window.mostrarModalExitoFactura = mostrarModalExitoFactura;
window.mostrarModalExitoConduce = mostrarModalExitoConduce;
window.compartirFactura = compartirFactura;
window.compartirConduce = compartirConduce;
