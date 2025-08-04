/**
 * Módulo de UI
 * Manejo de la interfaz de usuario, modales, notificaciones y navegación
 */

// Navegación y tabs
function switchTab(tabName) {
    // Actualizar botones
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    // Actualizar contenido
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `${tabName}-tab`);
    });

    window.StateModule.state.activeTab = tabName;
    
    // Guardar el tab activo en localStorage
    localStorage.setItem('activeTab', tabName);

    // Actualizar vista específica
    switch (tabName) {
        case 'ventas':
            if (window.VentasModule) window.VentasModule.updateVentasView();
            break;
        case 'ordenes':
            if (window.OrdenesModule) window.OrdenesModule.updateOrdenesView();
            break;
        case 'clientes':
            if (window.ClientesModule) window.ClientesModule.updateClientesView();
            break;
        case 'facturas':
            if (window.FacturasModule) window.FacturasModule.cargarFacturas();
            break;
        case 'creditos':
            if (window.CreditosModule) window.CreditosModule.loadCreditos();
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

    window.StateModule.state.filtroEstado = filter;

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

    if (window.OrdenesModule) {
        window.OrdenesModule.updateOrdenesView();
    }
}

// Función para actualizar vista de caja
function updateCajaView() {
    const fecha = window.StateModule.state.fechaSeleccionada;
    const ventas = window.StateModule.state.ventas.filter(v => !v.anulada);
    const ordenes = window.StateModule.state.ordenes.filter(o => !o.anulada);
    const facturas = (window.StateModule.state.facturas || []).filter(f => !f.anulada);
    const gastos = window.StateModule.state.gastos;
    const montoInicial = window.StateModule.state.montoInicial[fecha] || 0;

    // Incluir conduces que fueron pagados (facturados) en la fecha seleccionada
    const conducesPagadosHoy = (window.StateModule.state.conduces || []).filter(c => {
        // Incluir conduces que se convirtieron en facturas hoy
        if (c.estado === 'pagado' && c.facturaId) {
            const factura = facturas.find(f => f._id === c.facturaId);
            if (factura && window.StateModule.getLocalDateString(factura.fechaEmision) === fecha) {
                return true;
            }
        }
        return false;
    });

    // Calcular totales por método de pago incluyendo facturas y créditos pagados
    const totalesPorMetodo = {};
    
    [...ventas, ...ordenes, ...facturas].forEach(item => {
        const metodo = item.metodoPago || 'efectivo';
        if (!totalesPorMetodo[metodo]) {
            totalesPorMetodo[metodo] = 0;
        }
        // Para facturas usar total (subtotal + ITBIS), para otros usar monto o total
        let amount = 0;
        if (item.subtotal !== undefined) {
            // Es una factura - usar total completo (subtotal + ITBIS)
            amount = item.total || (item.subtotal + (item.itbis || 0));
        } else {
            // Es venta u orden - usar monto o total
            amount = item.monto || item.total || 0;
        }
        totalesPorMetodo[metodo] += amount;
    });

    // Nota: Los créditos ya están incluidos a través de las facturas que los pagaron

    // Calcular créditos creados hoy
    const creditosCreados = (window.StateModule.state.conduces || []).filter(c => {
        const fechaCreacion = c.fechaCreacion || c.createdAt;
        if (!fechaCreacion) return false;
        return window.StateModule.getLocalDateString(fechaCreacion) === fecha && c.estado === 'pendiente';
    });
    const totalCreditosCreados = creditosCreados.reduce((sum, c) => sum + c.total, 0);

    const totalIngresos = Object.values(totalesPorMetodo).reduce((sum, val) => sum + val, 0);
    const totalGastos = gastos.reduce((sum, gasto) => sum + gasto.monto, 0);
    const efectivoFinal = (totalesPorMetodo.efectivo || 0) + montoInicial - totalGastos;
    const gananciaTotal = totalIngresos - totalGastos;

    // Actualizar elementos del DOM con verificación de existencia
    const updateElement = (id, value) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = window.APIModule.formatCurrency(value);
        }
    };

    updateElement('ventas-totales', totalIngresos);
    updateElement('gastos-totales', totalGastos);
    updateElement('monto-inicial-display', montoInicial);
    updateElement('efectivo-esperado', efectivoFinal);
    updateElement('ganancia-total', gananciaTotal);
    updateElement('total-general', totalIngresos);
    updateElement('ganancia-neta', gananciaTotal);
    
    // Actualizar detalles específicos
    updateElement('detail-inicial', montoInicial);
    updateElement('detail-ventas-efectivo', totalesPorMetodo.efectivo || 0);
    updateElement('detail-gastos', totalGastos);

    // Actualizar desglose por método de pago específico
    updateElement('tarjeta-total', totalesPorMetodo.tarjeta || 0);
    updateElement('transferencia-total', totalesPorMetodo.transferencia || 0);
    
    // Actualizar información de créditos creados hoy
    updateElement('creditos-creados-total', totalCreditosCreados);
    const creditosDetailsElement = document.getElementById('creditos-creados-details');
    if (creditosDetailsElement) {
        if (creditosCreados.length > 0) {
            creditosDetailsElement.innerHTML = `${creditosCreados.length} conduces por ${window.APIModule.formatCurrency(totalCreditosCreados)}`;
        } else {
            creditosDetailsElement.innerHTML = 'No hay créditos creados hoy';
        }
    }
    
    // Actualizar contadores y detalles adicionales
    const totalTransacciones = ventas.length + ordenes.length + facturas.length;
    const transaccionesElement = document.getElementById('transacciones-total');
    if (transaccionesElement) {
        transaccionesElement.textContent = `${totalTransacciones} transacciones`;
    }

    // Actualizar desglose general (si existe)
    const desglose = document.getElementById('desglose-metodos');
    if (desglose) {
        desglose.innerHTML = Object.entries(totalesPorMetodo)
            .map(([metodo, total]) => `
                <div class="metodo-pago-item">
                    <span class="metodo-nombre">${metodo.charAt(0).toUpperCase() + metodo.slice(1)}</span>
                    <span class="metodo-total">${window.APIModule.formatCurrency(total)}</span>
                </div>
            `).join('');
    }

    // Lista de gastos
    updateGastosList();
}

function updateGastosList() {
    const gastosList = document.getElementById('gastos-list');
    if (!gastosList) return;
    
    const gastos = window.StateModule.state.gastos;
    
    if (gastos.length === 0) {
        gastosList.innerHTML = '<div class="no-data">No hay gastos registrados para esta fecha</div>';
        return;
    }
    
    gastosList.innerHTML = gastos.map(gasto => `
        <div class="gasto-item">
            <div class="gasto-info">
                <span class="gasto-descripcion">${gasto.descripcion}</span>
                <span class="gasto-hora">${new Date(gasto.timestamp).toLocaleTimeString()}</span>
            </div>
            <div class="gasto-monto">${window.APIModule.formatCurrency(gasto.monto)}</div>
        </div>
    `).join('');
}

// Actualizar todas las vistas
function updateAllViews() {
    if (window.VentasModule) window.VentasModule.updateVentasView();
    if (window.OrdenesModule) window.OrdenesModule.updateOrdenesView();
    updateCajaView();
}

// Refrescar modales abiertos cuando cambian los datos
function refreshOpenModals() {
    const modal = document.getElementById('modal');
    if (!modal || modal.classList.contains('hidden')) {
        return; // No hay modal abierto
    }
    
    const title = document.getElementById('modal-title').textContent;
    
    // Refrescar según el tipo de modal abierto
    if (title.includes('Conduce') && window.CreditosModule) {
        console.log('Refrescando modal de conduce...');
        window.CreditosModule.setupConduceModal();
    } else if (title.includes('Pagar Créditos') && window.CreditosModule) {
        console.log('Refrescando modal de pagar créditos...');
        window.CreditosModule.setupPagarCreditosModal();
    } else if (title.includes('Factura') && window.FacturasModule) {
        console.log('Refrescando modal de factura...');
        window.FacturasModule.setupFacturaModal();
    }
}

// Sistema de notificaciones elegantes
window.notify = {
    success: function(message) {
        showElegantNotification(message, 'success');
    },
    error: function(message) {
        showElegantNotification(message, 'error');
    },
    warning: function(message) {
        showElegantNotification(message, 'warning');
    },
    info: function(message) {
        showElegantNotification(message, 'info');
    }
};

function showElegantNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `elegant-notification ${type}`;
    
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-icon">${icons[type]}</span>
            <span class="notification-message">${message}</span>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;
    
    // Agregar estilos si no existen
    if (!document.getElementById('elegant-notification-styles')) {
        const styles = document.createElement('style');
        styles.id = 'elegant-notification-styles';
        styles.textContent = `
            .elegant-notification {
                position: fixed;
                top: 20px;
                right: 20px;
                min-width: 300px;
                max-width: 450px;
                padding: 0;
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.15);
                z-index: 10000;
                animation: slideInNotification 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255,255,255,0.2);
            }
            
            .elegant-notification.success {
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                color: white;
            }
            
            .elegant-notification.error {
                background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                color: white;
            }
            
            .elegant-notification.warning {
                background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                color: white;
            }
            
            .elegant-notification.info {
                background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                color: white;
            }
            
            .notification-content {
                display: flex;
                align-items: center;
                padding: 16px 20px;
                gap: 12px;
            }
            
            .notification-icon {
                font-size: 20px;
                flex-shrink: 0;
            }
            
            .notification-message {
                flex: 1;
                font-size: 14px;
                font-weight: 500;
                line-height: 1.4;
            }
            
            .notification-close {
                background: none;
                border: none;
                color: inherit;
                cursor: pointer;
                font-size: 20px;
                padding: 4px;
                border-radius: 6px;
                transition: background-color 0.2s;
                flex-shrink: 0;
            }
            
            .notification-close:hover {
                background-color: rgba(255,255,255,0.2);
            }
            
            @keyframes slideInNotification {
                from {
                    transform: translateX(100%) scale(0.8);
                    opacity: 0;
                }
                to {
                    transform: translateX(0) scale(1);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(styles);
    }
    
    document.body.appendChild(notification);
    
    // Auto-remover después de 5 segundos
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.animation = 'slideInNotification 0.3s reverse';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

// Función de confirmación elegante
window.elegantConfirm = function(message, title = 'Confirmación') {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'elegant-confirm-overlay';
        
        const modal = document.createElement('div');
        modal.className = 'elegant-confirm-modal';
        
        modal.innerHTML = `
            <div class="elegant-confirm-content">
                <h3 class="elegant-confirm-title">${title}</h3>
                <p class="elegant-confirm-message">${message}</p>
                <div class="elegant-confirm-buttons">
                    <button class="elegant-btn elegant-btn-cancel" onclick="handleConfirmResponse(false)">Cancelar</button>
                    <button class="elegant-btn elegant-btn-confirm" onclick="handleConfirmResponse(true)">Confirmar</button>
                </div>
            </div>
        `;
        
        // Agregar estilos si no existen
        if (!document.getElementById('elegant-confirm-styles')) {
            const styles = document.createElement('style');
            styles.id = 'elegant-confirm-styles';
            styles.textContent = `
                .elegant-confirm-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: rgba(0,0,0,0.6);
                    z-index: 10001;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    animation: fadeInOverlay 0.3s ease-out;
                    backdrop-filter: blur(4px);
                }
                
                .elegant-confirm-modal {
                    background: white;
                    border-radius: 16px;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.3);
                    max-width: 400px;
                    width: 90%;
                    animation: scaleInModal 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                }
                
                .elegant-confirm-content {
                    padding: 24px;
                }
                
                .elegant-confirm-title {
                    margin: 0 0 12px 0;
                    font-size: 18px;
                    font-weight: 600;
                    color: #1f2937;
                }
                
                .elegant-confirm-message {
                    margin: 0 0 24px 0;
                    color: #6b7280;
                    line-height: 1.5;
                }

                .elegant-input {
                    width: 100%;
                    padding: 12px;
                    border: 2px solid #e5e7eb;
                    border-radius: 8px;
                    font-size: 14px;
                    margin-bottom: 20px;
                    transition: border-color 0.2s;
                }
                
                .elegant-input:focus {
                    outline: none;
                    border-color: #3b82f6;
                }
                
                .elegant-confirm-buttons {
                    display: flex;
                    gap: 12px;
                    justify-content: flex-end;
                }
                
                .elegant-btn {
                    padding: 10px 20px;
                    border: none;
                    border-radius: 8px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-size: 14px;
                }
                
                .elegant-btn-cancel {
                    background-color: #f3f4f6;
                    color: #6b7280;
                }
                
                .elegant-btn-cancel:hover {
                    background-color: #e5e7eb;
                }
                
                .elegant-btn-confirm {
                    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                    color: white;
                }
                
                .elegant-btn-confirm:hover {
                    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
                    transform: translateY(-1px);
                }
                
                @keyframes fadeInOverlay {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                
                @keyframes scaleInModal {
                    from { transform: scale(0.8); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
            `;
            document.head.appendChild(styles);
        }
        
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        window.handleConfirmResponse = function(confirmed) {
            overlay.remove();
            delete window.handleConfirmResponse;
            resolve(confirmed);
        };
        
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                document.removeEventListener('keydown', handleEsc);
                window.handleConfirmResponse(false);
            }
        };
        document.addEventListener('keydown', handleEsc);
        
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                window.handleConfirmResponse(false);
            }
        });
    });
};

// Función de prompt elegante
window.elegantPrompt = function(message, title = 'Información requerida', placeholder = '') {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'elegant-confirm-overlay';
        
        const modal = document.createElement('div');
        modal.className = 'elegant-confirm-modal';
        
        modal.innerHTML = `
            <div class="elegant-confirm-content">
                <h3 class="elegant-confirm-title">${title}</h3>
                <p class="elegant-confirm-message">${message}</p>
                <input type="text" class="elegant-input" placeholder="${placeholder}" id="elegant-prompt-input">
                <div class="elegant-confirm-buttons">
                    <button class="elegant-btn elegant-btn-cancel" onclick="handlePromptResponse(null)">Cancelar</button>
                    <button class="elegant-btn elegant-btn-confirm" onclick="handlePromptResponse(document.getElementById('elegant-prompt-input').value)">Aceptar</button>
                </div>
            </div>
        `;
        
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        setTimeout(() => {
            const input = document.getElementById('elegant-prompt-input');
            if (input) {
                input.focus();
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        window.handlePromptResponse(input.value);
                    }
                });
            }
        }, 100);
        
        window.handlePromptResponse = function(value) {
            overlay.remove();
            delete window.handlePromptResponse;
            resolve(value);
        };
        
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                document.removeEventListener('keydown', handleEsc);
                window.handlePromptResponse(null);
            }
        };
        document.addEventListener('keydown', handleEsc);
        
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                window.handlePromptResponse(null);
            }
        });
    });
};

// Función para configurar event listeners globales
function setupEventListeners() {
    console.log('🎨 Configurando event listeners de UI...');
    
    // Event listeners para navegación de pestañas
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tab = e.currentTarget.dataset.tab;
            if (tab) {
                switchTab(tab);
            }
        });
    });
    
    // Event listeners para filtros
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const filtro = e.currentTarget.dataset.filter;
            if (filtro) {
                setFilter(filtro);
            }
        });
    });
    
    // Event listeners para botones de acción globales
    document.addEventListener('click', (e) => {
        // Manejar clics en botones con data-action
        const actionBtn = e.target.closest('[data-action]');
        if (actionBtn) {
            const action = actionBtn.dataset.action;
            handleGlobalAction(action, actionBtn);
        }
    });
    
    // Event listeners para formularios
    document.addEventListener('submit', (e) => {
        // Prevenir envío por defecto para formularios modales
        if (e.target.closest('.modal')) {
            e.preventDefault();
        }
    });
    
    console.log('✅ Event listeners de UI configurados');
}

// Función para manejar acciones globales
function handleGlobalAction(action, element) {
    console.log('🎬 Acción global:', action);
    
    switch (action) {
        case 'refresh-data':
            if (window.APIModule && window.APIModule.loadInitialData) {
                window.APIModule.loadInitialData();
            }
            break;
        case 'toggle-theme':
            toggleTheme();
            break;
        default:
            console.log('⚠️ Acción no reconocida:', action);
    }
}

// Función para alternar tema (preparado para futuro)
function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    localStorage.setItem('theme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
}

// Exportar funciones
window.UIModule = {
    switchTab,
    setFilter,
    updateCajaView,
    updateGastosList,
    updateAllViews,
    refreshOpenModals,
    showElegantNotification,
    setupEventListeners,
    handleGlobalAction,
    toggleTheme
};
