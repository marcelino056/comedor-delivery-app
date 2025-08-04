/**
 * Módulo de API
 * Configuración de API y funciones base de comunicación
 */

// Configuración
const API_BASE = window.location.origin + '/api';
const WS_URL = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.hostname}:3007`;

// Funciones de utilidad para API
function formatCurrency(amount) {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0
    }).format(amount);
}

function showLoading(show) {
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
        loadingIndicator.style.display = show ? 'block' : 'none';
    }
}

// Cargar datos para la fecha seleccionada
async function cargarDatosFecha() {
    console.log('[DEBUG] === CARGANDO DATOS PARA FECHA:', window.StateModule.state.fechaSeleccionada, '===');
    showLoading(true);
    try {
        const fecha = window.StateModule.state.fechaSeleccionada;
        const [ventasRes, ordenesRes, gastosRes, conducesRes] = await Promise.all([
            fetch(`${API_BASE}/ventas?fecha=${fecha}`),
            fetch(`${API_BASE}/ordenes?fecha=${fecha}`),
            fetch(`${API_BASE}/gastos?fecha=${fecha}`),
            fetch(`${API_BASE}/conduces`)
        ]);

        window.StateModule.state.ventas = await ventasRes.json();
        window.StateModule.state.ordenes = await ordenesRes.json();
        window.StateModule.state.gastos = await gastosRes.json();
        window.StateModule.state.conduces = await conducesRes.json();

        console.log('[DEBUG] Datos cargados:', {
            ventas: window.StateModule.state.ventas.length,
            ordenes: window.StateModule.state.ordenes.length,
            gastos: window.StateModule.state.gastos.length,
            conduces: window.StateModule.state.conduces.length
        });

        // Cargar monto inicial para la fecha seleccionada
        const montoRes = await fetch(`${API_BASE}/monto-inicial/${fecha}`);
        const montoData = await montoRes.json();
        window.StateModule.state.montoInicial[fecha] = montoData.monto;

        console.log('[DEBUG] Monto inicial cargado:', montoData.monto);

        // Actualizar todas las vistas
        if (window.UIModule && window.UIModule.updateAllViews) {
            window.UIModule.updateAllViews();
        }
    } catch (error) {
        console.error('Error cargando datos para la fecha:', error);
    } finally {
        showLoading(false);
    }
}

// Cargar datos iniciales
async function loadInitialData() {
    // Cargar datos para la fecha seleccionada (hoy por defecto)
    await cargarDatosFecha();
    
    // Cargar clientes y configuraciones
    if (window.ClientesModule) {
        await window.ClientesModule.cargarClientes();
    }
    if (window.ConfiguracionModule) {
        await window.ConfiguracionModule.cargarConfiguracionesRNC();
        await window.ConfiguracionModule.cargarConfiguracionEmpresa();
    }
    
    // Cargar facturas
    if (window.FacturasModule) {
        await window.FacturasModule.cargarFacturas();
    }
    
    // Cargar créditos
    if (window.CreditosModule) {
        await window.CreditosModule.loadCreditos();
    }
}

// Exportar funciones
window.APIModule = {
    API_BASE,
    WS_URL,
    formatCurrency,
    showLoading,
    cargarDatosFecha,
    loadInitialData
};
