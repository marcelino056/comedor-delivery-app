/**
 * Módulo de Ventas
 * Manejo de ventas locales, calculadora de venta y funciones relacionadas
 */

// Función para calcular y mostrar el total de la venta actual
function procesarVenta(metodoPago = 'efectivo') {
    const monto = window.StateModule.state.ventaActual || 0;
    
    if (monto <= 0) {
        window.UIModule.showElegantNotification('Por favor ingresa un monto válido', 'error');
        return;
    }
    
    // Procesar venta directamente sin confirmación para mayor rapidez
    submitVenta(monto, metodoPago);
}

// Función para actualizar la vista de ventas
function updateVentasView() {
    const container = document.getElementById('ventas-list');
    if (!container) return;
    
    const ventasRecientes = window.StateModule.state.ventas.slice(0, 10);
    const fechaEsHoy = esHoy();

    container.innerHTML = ventasRecientes.map(venta => `
        <div class="item-card ${venta.anulada ? 'anulada' : ''}">
            <div class="item-header">
                <div class="item-info ${venta.anulada ? 'anulada' : ''}">
                    <h4>${window.APIModule.formatCurrency(venta.monto)} ${venta.anulada ? '(ANULADA)' : ''}</h4>
                    <p>${venta.metodoPago}</p>
                    <p>${formatDateTime(venta.timestamp)}</p>
                </div>
                <div class="item-controls">
                    <div class="item-meta">
                        <span class="status-badge">Venta Local</span>
                        ${!venta.anulada && fechaEsHoy ? `
                            <button class="delete-btn" onclick="anularVenta('${venta._id}')" title="Anular venta">
                                🗑️
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Función para enviar venta
async function submitVenta(monto, metodoPago) {
    if (!monto || monto <= 0) {
        window.notify.error('Por favor ingresa un monto válido');
        return;
    }

    window.APIModule.showLoading(true);
    try {
        const response = await fetch(`${window.APIModule.API_BASE}/ventas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                monto,
                metodoPago,
                timestamp: new Date().toISOString()
            })
        });

        if (response.ok) {
            // Limpiar formulario
            limpiarMonto();
            
            // Mostrar feedback visual
            const metodosMap = {
                'efectivo': 'EFECTIVO',
                'tarjeta': 'TARJETA',
                'transferencia': 'TRANSFERENCIA'
            };
            mostrarFeedbackVenta(metodosMap[metodoPago] || metodoPago.toUpperCase());
            
            window.notify.success('Venta registrada exitosamente');
            // El WebSocket se encargará de actualizar la vista
        } else {
            throw new Error('Error al registrar venta');
        }
    } catch (error) {
        console.error('Error:', error);
        window.notify.error('Error al registrar la venta');
    } finally {
        window.APIModule.showLoading(false);
    }
}

// Función para anular venta
async function anularVenta(id) {
    console.log("[DEBUG] anularVenta llamada con ID:", id, typeof id);
    if (!id || id === "undefined") {
        window.notify.error("ID de venta inválido");
        return;
    }
    
    const confirmed = await window.elegantConfirm(
        '¿Estás seguro de anular esta venta?',
        'Anular Venta'
    );
    if (!confirmed) return;

    console.log('[FRONTEND] Anulando venta:', id);
    window.APIModule.showLoading(true);
    try {
        const response = await fetch(`${window.APIModule.API_BASE}/ventas/${id}/anular`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log('[FRONTEND] Respuesta de anular venta:', response.status);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.error || `Error ${response.status}: ${response.statusText}`;
            throw new Error(errorMessage);
        }

        const ventaAnulada = await response.json();
        console.log('[FRONTEND] Venta anulada exitosamente:', ventaAnulada._id);
        
        // Recargar datos para reflejar los cambios
        await window.APIModule.cargarDatosFecha();
        
        window.notify.success('Venta anulada exitosamente');
        
    } catch (error) {
        console.error('[FRONTEND] Error al anular venta:', error);
        window.notify.error(`Error al anular la venta: ${error.message}`);
    } finally {
        window.APIModule.showLoading(false);
    }
}

// Funciones del teclado numérico
function agregarDigito(digito) {
    const montoActual = window.StateModule.state.ventaActual || 0;
    const nuevoMonto = parseInt(montoActual.toString() + digito.toString());
    window.StateModule.state.ventaActual = nuevoMonto;
    actualizarDisplayVenta();
}

function borrarDigito() {
    const montoStr = window.StateModule.state.ventaActual.toString();
    if (montoStr.length > 1) {
        window.StateModule.state.ventaActual = parseInt(montoStr.slice(0, -1)) || 0;
    } else {
        window.StateModule.state.ventaActual = 0;
    }
    actualizarDisplayVenta();
}

function limpiarMonto() {
    window.StateModule.state.ventaActual = 0;
    actualizarDisplayVenta();
}

function establecerMonto(cantidad) {
    window.StateModule.state.ventaActual = cantidad;
    actualizarDisplayVenta();
}

function actualizarDisplayVenta() {
    const display = document.getElementById('venta-display-amount');
    
    if (!display) return;
    
    const valor = window.StateModule.state.ventaActual || 0;
    display.textContent = window.APIModule.formatCurrency(valor);
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

// Función para verificar si la fecha seleccionada es hoy
function esHoy() {
    const hoy = window.StateModule.getLocalDateString();
    return window.StateModule.state.fechaSeleccionada === hoy;
}

// Función para formatear fecha y hora
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

// Funciones para manejar el historial de ventas
function toggleHistorialVentas() {
    window.StateModule.state.historialVisible = !window.StateModule.state.historialVisible;
    const historial = document.getElementById('historial-ventas');
    const btnToggle = document.querySelector('[onclick="toggleHistorialVentas()"]');
    
    if (window.StateModule.state.historialVisible) {
        historial.classList.remove('hidden');
        btnToggle.textContent = '📈 Ocultar Historial';
    } else {
        historial.classList.add('hidden');
        btnToggle.textContent = '📈 Ver Historial';
    }
}

// Exportar funciones del módulo
window.VentasModule = {
    procesarVenta,
    updateVentasView,
    submitVenta,
    anularVenta,
    agregarDigito,
    borrarDigito,
    limpiarMonto,
    establecerMonto,
    actualizarDisplayVenta,
    mostrarFeedbackVenta,
    toggleHistorialVentas
};

// Exponer funciones globalmente para compatibilidad
window.procesarVenta = procesarVenta;
window.submitVenta = submitVenta;
window.anularVenta = anularVenta;
window.agregarDigito = agregarDigito;
window.borrarDigito = borrarDigito;
window.limpiarMonto = limpiarMonto;
window.establecerMonto = establecerMonto;
window.actualizarDisplayVenta = actualizarDisplayVenta;
window.toggleHistorialVentas = toggleHistorialVentas;
