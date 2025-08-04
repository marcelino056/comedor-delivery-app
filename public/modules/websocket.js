/**
 * Módulo de WebSocket
 * Manejo de conexiones WebSocket y mensajes en tiempo real
 */

function connectWebSocket() {
    try {
        window.StateModule.state.ws = new WebSocket(window.APIModule.WS_URL);
        
        window.StateModule.state.ws.onopen = () => {
            console.log('WebSocket conectado');
        };

        window.StateModule.state.ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            handleWebSocketMessage(message);
        };

        window.StateModule.state.ws.onclose = () => {
            console.log('WebSocket desconectado, intentando reconectar...');
            setTimeout(connectWebSocket, 3000);
        };

        window.StateModule.state.ws.onerror = (error) => {
            console.error('Error WebSocket:', error);
        };
    } catch (error) {
        console.error('Error conectando WebSocket:', error);
    }
}

function handleWebSocketMessage(message) {
    switch (message.type) {
        case 'nueva_venta':
            window.StateModule.state.ventas.unshift(message.data);
            if (window.VentasModule) window.VentasModule.updateVentasView();
            if (window.UIModule) window.UIModule.updateCajaView();
            break;
        case 'venta_anulada':
            const venta = window.StateModule.state.ventas.find(v => v.id === message.data.id);
            if (venta) venta.anulada = 1;
            if (window.VentasModule) window.VentasModule.updateVentasView();
            if (window.UIModule) window.UIModule.updateCajaView();
            break;
        case 'nueva_orden':
            window.StateModule.state.ordenes.unshift(message.data);
            if (window.OrdenesModule) window.OrdenesModule.updateOrdenesView();
            if (window.UIModule) window.UIModule.updateCajaView();
            break;
        case 'orden_actualizada':
            const orden = window.StateModule.state.ordenes.find(o => o._id === message.data._id);
            if (orden) {
                Object.assign(orden, message.data);
            }
            if (window.OrdenesModule) window.OrdenesModule.updateOrdenesView();
            if (window.UIModule) window.UIModule.updateCajaView();
            break;
        case 'orden_anulada':
            const ordenAnular = window.StateModule.state.ordenes.find(o => o._id === message.data._id);
            if (ordenAnular) ordenAnular.anulada = 1;
            if (window.OrdenesModule) window.OrdenesModule.updateOrdenesView();
            if (window.UIModule) window.UIModule.updateCajaView();
            break;
        case 'nuevo_gasto':
            window.StateModule.state.gastos.unshift(message.data);
            if (window.UIModule) {
                window.UIModule.updateGastosList();
                window.UIModule.updateCajaView();
            }
            break;
        case 'monto_inicial_actualizado':
            window.StateModule.state.montoInicial[message.data.fecha] = message.data.monto;
            if (window.UIModule) window.UIModule.updateCajaView();
            break;
        case 'nuevo_conduce':
            window.StateModule.state.conduces.unshift(message.data);
            if (window.CreditosModule) {
                window.CreditosModule.updateCreditosSummary(window.StateModule.state.conduces);
                window.CreditosModule.renderConducesList(window.StateModule.state.conduces);
                window.CreditosModule.updateClientFilters(window.StateModule.state.clientes);
            }
            break;
        case 'cliente_actualizado':
        case 'nuevo_cliente':
            console.log('[WEBSOCKET] Cliente actualizado, recargando clientes...');
            if (window.ClientesModule) {
                window.ClientesModule.cargarClientes().then(() => {
                    if (window.CreditosModule) {
                        window.CreditosModule.updateClientFilters(window.StateModule.state.clientes);
                    }
                    if (window.UIModule) {
                        window.UIModule.refreshOpenModals();
                    }
                });
            }
            break;
        case 'nueva_factura':
            console.log('[WEBSOCKET] Nueva factura recibida, recargando datos...');
            if (window.StateModule.state.facturas) {
                window.StateModule.state.facturas.unshift(message.data);
                if (window.FacturasModule) {
                    window.FacturasModule.updateFacturasView();
                }
            }
            break;
        case 'creditos_actualizados':
            console.log('[WEBSOCKET] Créditos actualizados, recargando lista...');
            if (window.CreditosModule) {
                window.CreditosModule.loadCreditos();
            }
            break;
    }
}

// Exportar funciones
window.WebSocketModule = {
    connectWebSocket,
    handleWebSocketMessage
};
