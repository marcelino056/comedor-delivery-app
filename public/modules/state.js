/**
 * Módulo de Estado Global
 * Maneja el estado de la aplicación y funciones de fechas
 */

// Función helper para obtener fecha local en formato YYYY-MM-DD
function getLocalDateString(date = new Date()) {
    // Si ya es un string en formato YYYY-MM-DD, devolverlo tal como está
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return date;
    }
    
    // Si es un timestamp o string de fecha, convertir a objeto Date
    if (typeof date === 'string' || typeof date === 'number') {
        date = new Date(date);
    }
    
    // Verificar que es un objeto Date válido
    if (!(date instanceof Date) || isNaN(date.getTime())) {
        console.error('[getLocalDateString] Fecha inválida recibida:', date);
        return new Date().toISOString().split('T')[0]; // Fallback a hoy
    }
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Estado global de la aplicación
const state = {
    ventas: [],
    ordenes: [],
    gastos: [],
    montoInicial: {},
    clientes: [],
    facturas: [],
    conduces: [],
    configuracionesRNC: [],
    configuracionEmpresa: {},
    activeTab: localStorage.getItem('activeTab') || 'ventas',
    filtroEstado: 'todos',
    ws: null,
    ventaActual: 0,
    historialVisible: false,
    fechaSeleccionada: getLocalDateString()
};

// Funciones de manejo de fecha
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
    
    // Marcar si es hoy, ayer, etc. usando fecha local
    const hoy = getLocalDateString();
    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 1);
    const ayerStr = getLocalDateString(ayer);
    
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
    state.fechaSeleccionada = getLocalDateString();
    updateCurrentDate();
    cargarDatosFecha();
}

// Exportar funciones y estado
window.StateModule = {
    state,
    getLocalDateString,
    updateCurrentDate,
    cambiarFecha,
    cambiarFechaSeleccionada,
    irAHoy
};
