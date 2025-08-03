/**
 * Utilidades para manejo de fechas en República Dominicana (UTC-4)
 */

const TIMEZONE_OFFSET = -4; // República Dominicana UTC-4

/**
 * Obtiene la fecha actual en el timezone de República Dominicana
 * @returns {Date} Fecha local ajustada
 */
function getLocalDate() {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    return new Date(utc + (TIMEZONE_OFFSET * 3600000));
}

/**
 * Obtiene el inicio del día (00:00:00) en fecha local
 * @param {string|Date} fecha - Fecha en formato YYYY-MM-DD o objeto Date
 * @returns {Date} Inicio del día en fecha local
 */
function getStartOfDay(fecha) {
    let targetDate;
    if (typeof fecha === 'string') {
        targetDate = new Date(fecha + 'T00:00:00');
    } else {
        targetDate = new Date(fecha);
        targetDate.setHours(0, 0, 0, 0);
    }
    return targetDate;
}

/**
 * Obtiene el final del día (23:59:59.999) en fecha local
 * @param {string|Date} fecha - Fecha en formato YYYY-MM-DD o objeto Date
 * @returns {Date} Final del día en fecha local
 */
function getEndOfDay(fecha) {
    let targetDate;
    if (typeof fecha === 'string') {
        targetDate = new Date(fecha + 'T23:59:59.999');
    } else {
        targetDate = new Date(fecha);
        targetDate.setHours(23, 59, 59, 999);
    }
    return targetDate;
}

/**
 * Obtiene la fecha en formato YYYY-MM-DD para República Dominicana
 * @param {Date} fecha - Fecha a formatear (opcional, por defecto fecha actual)
 * @returns {string} Fecha en formato YYYY-MM-DD
 */
function getLocalDateString(fecha) {
    const localDate = fecha ? new Date(fecha) : getLocalDate();
    return localDate.toISOString().split('T')[0];
}

/**
 * Agrega días a una fecha manteniendo el timezone local
 * @param {Date} fecha - Fecha base
 * @param {number} dias - Días a agregar
 * @returns {Date} Nueva fecha con días agregados
 */
function addDays(fecha, dias) {
    const result = new Date(fecha);
    result.setDate(result.getDate() + dias);
    return result;
}

/**
 * Convierte una fecha de string a Date asegurando timezone correcto
 * @param {string} fechaString - Fecha en formato YYYY-MM-DD
 * @returns {Date} Fecha convertida
 */
function parseLocalDate(fechaString) {
    return new Date(fechaString + 'T12:00:00'); // Usar mediodía para evitar problemas de timezone
}

/**
 * Obtiene un timestamp ISO estandarizado
 * @param {Date} fecha - Fecha a convertir (opcional, por defecto fecha actual)
 * @returns {string} Timestamp ISO
 */
function getISOTimestamp(fecha) {
    const targetDate = fecha || getLocalDate();
    return targetDate.toISOString();
}

module.exports = {
    getLocalDate,
    getStartOfDay,
    getEndOfDay,
    getLocalDateString,
    addDays,
    parseLocalDate,
    getISOTimestamp,
    TIMEZONE_OFFSET
};
