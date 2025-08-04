/**
 * Módulo de Gastos
 * Manejo de gastos y monto inicial de caja
 */

// Función para enviar gasto
async function submitGasto() {
    console.log('submitGasto ejecutándose...');
    const concepto = document.getElementById('gasto-concepto').value;
    const monto = parseFloat(document.getElementById('gasto-monto').value);
    console.log('Datos del formulario:', { concepto, monto });

    if (!concepto || !monto || monto <= 0) {
        window.notify.error('Por favor completa todos los campos');
        return;
    }

    const payload = {
        descripcion: concepto,
        monto,
        categoria: 'otros',
        timestamp: new Date().toISOString()
    };
    console.log('Payload que se va a enviar:', payload);

    window.APIModule.showLoading(true);
    try {
        const response = await fetch(`${window.APIModule.API_BASE}/gastos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error response:', response.status, errorText);
            throw new Error(`Error al registrar gasto: ${response.status} - ${errorText}`);
        }
        
        // Recargar datos después del cambio
        await window.APIModule.cargarDatosFecha();
        if (window.UIModule && window.UIModule.closeModal) {
            window.UIModule.closeModal();
        } else {
            closeModal();
        }
        window.notify.success('Gasto registrado exitosamente');
    } catch (error) {
        console.error('Error:', error);
        window.notify.error('Error al registrar el gasto');
    } finally {
        window.APIModule.showLoading(false);
    }
}

// Función para establecer monto inicial
async function submitMontoInicial() {
    const monto = parseFloat(document.getElementById('monto-inicial').value);

    if (!monto || monto < 0) {
        window.notify.error('Por favor ingresa un monto válido');
        return;
    }

    window.APIModule.showLoading(true);
    try {
        const fecha = new Date().toISOString().split('T')[0];
        const response = await fetch(`${window.APIModule.API_BASE}/monto-inicial`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fecha, monto })
        });

        if (!response.ok) {
            throw new Error('Error al establecer monto inicial');
        }

        // Actualizar estado local
        window.StateModule.state.montoInicial[fecha] = monto;
        
        // Actualizar vista
        if (window.UIModule && window.UIModule.updateCajaView) {
            window.UIModule.updateCajaView();
        }
        if (window.UIModule && window.UIModule.closeModal) {
            window.UIModule.closeModal();
        } else {
            closeModal();
        }
        window.notify.success('Monto inicial establecido exitosamente');
    } catch (error) {
        console.error('Error:', error);
        window.notify.error('Error al establecer el monto inicial');
    } finally {
        window.APIModule.showLoading(false);
    }
}

// Función para calcular totales del día
function calcularTotalesDia() {
    const fechaSeleccionada = window.StateModule.state.fechaSeleccionada;
    console.log('[DEBUG] === CALCULANDO TOTALES PARA:', fechaSeleccionada, '===');
    console.log('[DEBUG] Estado actual:', {
        ventas: window.StateModule.state.ventas?.length || 0,
        ordenes: window.StateModule.state.ordenes?.length || 0,
        facturas: window.StateModule.state.facturas?.length || 0,
        conduces: window.StateModule.state.conduces?.length || 0,
        gastos: window.StateModule.state.gastos?.length || 0
    });
    
    const ventasFecha = window.StateModule.state.ventas.filter(v => 
        window.StateModule.getLocalDateString(v.timestamp) === fechaSeleccionada && !v.anulada
    );
    
    const gastosFecha = window.StateModule.state.gastos.filter(g => 
        window.StateModule.getLocalDateString(g.timestamp) === fechaSeleccionada
    );

    const ordenesFecha = window.StateModule.state.ordenes.filter(o => 
        window.StateModule.getLocalDateString(o.timestamp) === fechaSeleccionada && !o.anulada
    );

    // Filtrar créditos (conduces) creados en la fecha seleccionada
    const conducesFecha = (window.StateModule.state.conduces || []).filter(c => {
        const fechaCreacion = c.fechaCreacion || c.createdAt;
        if (!fechaCreacion) return false;
        return window.StateModule.getLocalDateString(fechaCreacion) === fechaSeleccionada;
    });

    // Filtrar facturas por fecha de emisión
    const facturasFecha = (window.StateModule.state.facturas || []).filter(f => {
        if (!f.fechaEmision || f.anulada) return false;
        return window.StateModule.getLocalDateString(f.fechaEmision) === fechaSeleccionada;
    });

    console.log('[DEBUG] Datos filtrados por fecha:', {
        ventasFecha: ventasFecha.length,
        ordenesFecha: ordenesFecha.length,
        facturasFecha: facturasFecha.length,
        conducesFecha: conducesFecha.length,
        gastosFecha: gastosFecha.length
    });

    const totalVentasLocal = ventasFecha.reduce((sum, venta) => sum + venta.monto, 0);
    const totalVentasDelivery = ordenesFecha.reduce((sum, orden) => sum + orden.total, 0);
    const totalFacturas = facturasFecha.reduce((sum, factura) => sum + (factura.total || (factura.subtotal + (factura.itbis || 0))), 0);
    const totalCreditosCreados = conducesFecha.reduce((sum, conduce) => sum + conduce.total, 0);
    const totalVentas = totalVentasLocal + totalVentasDelivery + totalFacturas;
    const totalGastos = gastosFecha.reduce((sum, gasto) => sum + gasto.monto, 0);
    const totalTransacciones = ventasFecha.length + ordenesFecha.length + facturasFecha.length;

    console.log('[DEBUG] Totales calculados:', {
        totalVentasLocal,
        totalVentasDelivery,
        totalFacturas,
        totalVentas,
        totalGastos,
        totalTransacciones
    });
    
    // Calcular ventas por método de pago
    const ventasEfectivo = ventasFecha
        .filter(item => item.metodoPago === 'efectivo')
        .reduce((sum, item) => sum + item.monto, 0) +
        ordenesFecha
        .filter(item => item.metodoPago === 'efectivo')
        .reduce((sum, item) => sum + item.total, 0) +
        facturasFecha
        .filter(item => item.metodoPago === 'efectivo')
        .reduce((sum, item) => sum + (item.total || (item.subtotal + (item.itbis || 0))), 0);
    
    const ventasTarjeta = ventasFecha
        .filter(item => item.metodoPago === 'tarjeta')
        .reduce((sum, item) => sum + item.monto, 0) +
        ordenesFecha
        .filter(item => item.metodoPago === 'tarjeta')
        .reduce((sum, item) => sum + item.total, 0) +
        facturasFecha
        .filter(item => item.metodoPago === 'tarjeta')
        .reduce((sum, item) => sum + (item.total || (item.subtotal + (item.itbis || 0))), 0);
    
    const ventasTransferencia = ventasFecha
        .filter(item => item.metodoPago === 'transferencia')
        .reduce((sum, item) => sum + item.monto, 0) +
        ordenesFecha
        .filter(item => item.metodoPago === 'transferencia')
        .reduce((sum, item) => sum + item.total, 0) +
        facturasFecha
        .filter(item => item.metodoPago === 'transferencia')
        .reduce((sum, item) => sum + (item.total || (item.subtotal + (item.itbis || 0))), 0);
    
    // Monto inicial del día seleccionado
    const montoInicial = window.StateModule.state.montoInicial[window.StateModule.state.fechaSeleccionada] || 0;
    
    // Efectivo esperado en caja
    const efectivoEsperado = montoInicial + ventasEfectivo - totalGastos;

    return {
        totalVentas,
        totalGastos,
        totalTransacciones,
        ganancia: totalVentas - totalGastos,
        ventasLocales: ventasFecha.length,
        delivery: ordenesFecha.length,
        facturas: facturasFecha.length,
        montoInicial,
        ventasEfectivo,
        ventasTarjeta,
        ventasTransferencia,
        efectivoEsperado,
        creditosCreados: totalCreditosCreados,
        conducesCreados: conducesFecha.length
    };
}

// Función para generar reporte diario
async function generarReporteDiario() {
    const fecha = window.StateModule.state.fechaSeleccionada;
    
    try {
        window.APIModule.showLoading(true);
        
        const response = await fetch(`${window.APIModule.API_BASE}/reporte/diario/${fecha}`);
        
        if (!response.ok) {
            throw new Error('Error al generar reporte');
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte-diario-${fecha}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        window.notify.success('Reporte generado exitosamente');
        
    } catch (error) {
        console.error('Error generando reporte:', error);
        window.notify.error('Error al generar el reporte diario');
    } finally {
        window.APIModule.showLoading(false);
    }
}

// Exportar funciones del módulo
window.GastosModule = {
    submitGasto,
    submitMontoInicial,
    calcularTotalesDia,
    generarReporteDiario
};

// Exponer funciones globalmente para compatibilidad
window.submitGasto = submitGasto;
window.submitMontoInicial = submitMontoInicial;
window.generarReporteDiario = generarReporteDiario;
