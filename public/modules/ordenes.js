/**
 * Módulo de Órdenes
 * Manejo de órdenes de delivery y su ciclo de vida
 */

// Función para actualizar la vista de órdenes
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
                <p>No hay pedidos ${window.StateModule.state.filtroEstado !== 'todos' ? `en estado "${window.StateModule.state.filtroEstado.replace('-', ' ')}"` : ''}</p>
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
                        <p>💰 Pedido: ${window.APIModule.formatCurrency(orden.monto)}</p>
                        <p>🚚 Delivery: ${window.APIModule.formatCurrency(orden.costoDelivery)}</p>
                        <p class="total">💵 Total: ${window.APIModule.formatCurrency(orden.total)}</p>
                    </div>
                    ${!orden.anulada && fechaEsHoy && orden.estado !== 'entregada' ? `
                        <div class="payment-buttons">
                            <button class="payment-btn efectivo ${orden.metodoPago === 'efectivo' ? 'active' : ''}" 
                                    onclick="cambiarMetodoPagoOrden('${orden._id}', 'efectivo')">
                                💵 Efectivo
                            </button>
                            <button class="payment-btn tarjeta ${orden.metodoPago === 'tarjeta' ? 'active' : ''}"
                                    onclick="cambiarMetodoPagoOrden('${orden._id}', 'tarjeta')">
                                💳 Tarjeta
                            </button>
                            <button class="payment-btn transferencia ${orden.metodoPago === 'transferencia' ? 'active' : ''}"
                                    onclick="cambiarMetodoPagoOrden('${orden._id}', 'transferencia')">
                                🏦 Transfer
                            </button>
                            <button class="payment-btn credito ${orden.metodoPago === 'credito' ? 'active' : ''}"
                                    onclick="cambiarMetodoPagoOrden('${orden._id}', 'credito')">
                                📋 Crédito
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
                        ${!orden.anulada && fechaEsHoy && orden.estado !== 'entregada' ? `
                            <button class="delete-btn" onclick="anularOrden('${orden._id}')" title="Anular orden">
                                🗑️
                            </button>
                        ` : ''}
                    </div>
                    ${!orden.anulada && fechaEsHoy && orden.estado !== 'entregada' ? `
                        <div class="state-buttons">
                            <button class="state-btn recibida ${orden.estado === 'recibida' ? 'active' : ''}"
                                    onclick="cambiarEstadoOrden('${orden._id}', 'recibida')">
                                Recibida
                            </button>
                            <button class="state-btn preparando ${orden.estado === 'preparando' ? 'active' : ''}"
                                    onclick="cambiarEstadoOrden('${orden._id}', 'preparando')">
                                Preparando
                            </button>
                            <button class="state-btn en-camino ${orden.estado === 'en-camino' ? 'active' : ''}"
                                    onclick="cambiarEstadoOrden('${orden._id}', 'en-camino')">
                                En Camino
                            </button>
                            <button class="state-btn entregada ${orden.estado === 'entregada' ? 'active' : ''}"
                                    onclick="cambiarEstadoOrden('${orden._id}', 'entregada')">
                                Entregada
                            </button>
                        </div>
                    ` : !orden.anulada && fechaEsHoy && orden.estado === 'entregada' ? `
                        <div class="state-display-final">
                            <span style="font-size: 0.75rem; color: #10b981; background-color: #d1fae5; border: 1px solid #10b981; border-radius: 0.25rem; padding: 0.25rem 0.5rem; font-weight: 600;">
                                ✅ ENTREGADA (FINAL)
                            </span>
                            <small style="display: block; color: #6b7280; font-size: 0.625rem; margin-top: 0.25rem;">
                                Estado final - No se puede modificar
                            </small>
                            <div style="margin-top: 0.5rem;">
                                ${orden.facturaId ? `
                                    <div class="factura-info" style="background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 0.5rem; padding: 0.5rem 0.75rem; display: inline-flex; align-items: center; gap: 0.5rem;">
                                        <span style="color: #0369a1; font-weight: 600; font-size: 0.75rem;">📄 Factura #${orden.numeroFactura || orden.facturaId}</span>
                                        <button onclick="descargarFacturaPDF('${orden.facturaId}')" style="background: none; border: none; color: #0369a1; cursor: pointer; padding: 0.25rem; border-radius: 0.25rem; font-size: 0.75rem;" title="Descargar factura">
                                            📥
                                        </button>
                                        <button onclick="imprimirFactura('${orden.facturaId}')" style="background: none; border: none; color: #0369a1; cursor: pointer; padding: 0.25rem; border-radius: 0.25rem; font-size: 0.75rem;" title="Imprimir factura">
                                            🖨️
                                        </button>
                                    </div>
                                ` : `
                                    <button class="btn-factura-delivery" onclick="solicitarFacturaDelivery('${orden._id}')" title="Generar factura para esta orden">
                                        🧾 Solicitar Factura
                                    </button>
                                `}
                            </div>
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
        todos: window.StateModule.state.ordenes.filter(o => !o.anulada).length,
        preparando: window.StateModule.state.ordenes.filter(o => o.estado === 'preparando' && !o.anulada).length,
        recibida: window.StateModule.state.ordenes.filter(o => o.estado === 'recibida' && !o.anulada).length,
        'en-camino': window.StateModule.state.ordenes.filter(o => o.estado === 'en-camino' && !o.anulada).length,
        entregada: window.StateModule.state.ordenes.filter(o => o.estado === 'entregada' && !o.anulada).length,
        anuladas: window.StateModule.state.ordenes.filter(o => o.anulada).length
    };

    Object.keys(counts).forEach(key => {
        const element = document.getElementById(`count-${key}`);
        if (element) {
            element.textContent = counts[key];
        }
    });
}

function filterOrdenes() {
    if (window.StateModule.state.filtroEstado === 'todos') {
        return window.StateModule.state.ordenes;
    } else if (window.StateModule.state.filtroEstado === 'anuladas') {
        return window.StateModule.state.ordenes.filter(o => o.anulada);
    } else {
        return window.StateModule.state.ordenes.filter(o => !o.anulada && o.estado === window.StateModule.state.filtroEstado);
    }
}

function sortOrdenes(ordenes) {
    if (window.StateModule.state.filtroEstado === 'todos') {
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

// Función para enviar orden
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
        window.notify.error('Por favor completa todos los campos obligatorios');
        return;
    }

    window.APIModule.showLoading(true);
    try {
        const response = await fetch(`${window.APIModule.API_BASE}/ordenes`, {
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
            window.notify.success('Orden registrada exitosamente');
        } else {
            const errorText = await response.text();
            console.error('Error al registrar orden:', errorText);
            window.notify.error('Error al registrar la orden');
        }
    } catch (error) {
        console.error('Error al registrar la orden (catch):', error);
        window.notify.error('Error al registrar la orden');
    } finally {
        window.APIModule.showLoading(false);
    }
}

// Función para anular orden
async function anularOrden(id) {
    // Validar que la orden no esté entregada
    const orden = window.StateModule.state.ordenes.find(o => o._id === id);
    if (orden && orden.estado === 'entregada') {
        window.notify.warning('No se puede anular una orden que ya fue entregada');
        return;
    }

    const confirmed = await window.elegantConfirm(
        '¿Estás seguro de anular esta orden?',
        'Anular Orden'
    );
    if (!confirmed) return;

    window.APIModule.showLoading(true);
    try {
        const response = await fetch(`${window.APIModule.API_BASE}/ordenes/${id}/anular`, {
            method: 'PUT'
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Error al anular orden');
        }
        
        // Recargar datos después del cambio
        await window.APIModule.cargarDatosFecha();
        window.notify.success('Orden anulada exitosamente');
    } catch (error) {
        console.error('Error:', error);
        window.notify.error('Error al anular la orden');
    } finally {
        window.APIModule.showLoading(false);
    }
}

// Función para cambiar estado de orden
async function cambiarEstadoOrden(id, estado) {
    // Validar que la orden no esté ya entregada
    const orden = window.StateModule.state.ordenes.find(o => o._id === id);
    if (orden && orden.estado === 'entregada') {
        window.notify.warning('No se puede cambiar el estado de una orden entregada');
        return;
    }

    // Confirmar si se está marcando como entregada
    if (estado === 'entregada') {
        const confirmed = await window.elegantConfirm(
            '¿Confirmar entrega?\n\nUna vez marcada como entregada:\n• No se podrá cambiar el estado\n• Se habilitará la opción de facturación\n• El pedido quedará finalizado',
            'Confirmar Entrega'
        );
        
        if (!confirmed) {
            return;
        }
    }

    window.APIModule.showLoading(true);
    try {
        const response = await fetch(`${window.APIModule.API_BASE}/ordenes/${id}/estado`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estado })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Error al cambiar estado');
        }
        
        // Recargar datos después del cambio
        await window.APIModule.cargarDatosFecha();
        
        if (estado === 'entregada') {
            // Verificar si el método de pago es crédito para generar conduce automáticamente
            const orden = window.StateModule.state.ordenes.find(o => o._id === id);
            if (orden && orden.metodoPago === 'credito') {
                try {
                    console.log('💳 ENTREGA A CRÉDITO: Generando conduce automático...');
                    await generarConduceDelivery(orden);
                    window.notify.success('✅ Orden entregada exitosamente\n📋 Conduce generado automáticamente por pago a crédito');
                } catch (error) {
                    console.error('💳 ERROR CONDUCE AUTOMÁTICO:', error);
                    window.notify.warning(`✅ Orden entregada, pero error al generar conduce: ${error.message}`);
                }
            } else {
                window.notify.success('✅ Orden entregada exitosamente\n\nYa puede generar factura para este pedido');
            }
        } else {
            window.notify.success(`Estado cambiado a: ${estado.replace('-', ' ').toUpperCase()}`);
        }
    } catch (error) {
        console.error('Error:', error);
        window.notify.error(`Error al cambiar el estado: ${error.message}`);
    } finally {
        window.APIModule.showLoading(false);
    }
}

// Función para cambiar método de pago
async function cambiarMetodoPagoOrden(id, metodoPago) {
    // Validar que la orden no esté entregada
    const orden = window.StateModule.state.ordenes.find(o => o._id === id);
    if (orden && orden.estado === 'entregada') {
        window.notify.warning('No se puede cambiar el método de pago de una orden entregada');
        return;
    }

    window.APIModule.showLoading(true);
    try {
        const response = await fetch(`${window.APIModule.API_BASE}/ordenes/${id}/metodoPago`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ metodoPago })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Error al cambiar método de pago');
        }
        
        // Recargar datos después del cambio
        await window.APIModule.cargarDatosFecha();
        window.notify.success(`Método de pago cambiado a: ${metodoPago.toUpperCase()}`);
    } catch (error) {
        console.error('Error:', error);
        window.notify.error(`Error al cambiar el método de pago: ${error.message}`);
    } finally {
        window.APIModule.showLoading(false);
    }
}

// Función auxiliar para formatear fecha y hora
function formatDateTime(timestamp) {
    const fecha = new Date(timestamp);
    return fecha.toLocaleString('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

// Función auxiliar para verificar si es hoy
function esHoy() {
    const hoy = window.StateModule.getLocalDateString();
    return window.StateModule.state.fechaSeleccionada === hoy;
}

// Exportar funciones del módulo
window.OrdenesModule = {
    updateOrdenesView,
    updateFilterCounts,
    filterOrdenes,
    sortOrdenes,
    submitOrden,
    anularOrden,
    cambiarEstadoOrden,
    cambiarMetodoPagoOrden
};

// Exponer funciones globalmente para compatibilidad
window.submitOrden = submitOrden;
window.anularOrden = anularOrden;
window.cambiarEstadoOrden = cambiarEstadoOrden;
window.cambiarMetodoPagoOrden = cambiarMetodoPagoOrden;
