# 📄 Reporte Diario de Ventas - PDF

Se ha implementado un sistema de reportes diarios en formato PDF que permite generar un reporte completo de todas las actividades del día al momento del cierre de caja.

## ✨ Características del Reporte

### 📊 Datos Incluidos
- **Resumen ejecutivo**: Monto inicial, ventas totales, gastos, ganancia neta
- **Desglose por método de pago**: Efectivo, tarjeta, transferencias
- **Cálculo de efectivo esperado en caja**: Incluye monto inicial + ventas efectivo - gastos
- **Detalle de transacciones**: Lista completa de ventas locales y órdenes de delivery
- **Registro de gastos**: Todos los gastos del día con conceptos y montos
- **Estadísticas**: Número de transacciones, ventas por modalidad

### 🎨 Diseño del PDF
- **Formato profesional**: Diseño limpio con colores corporativos
- **Información organizada**: Secciones claramente definidas
- **Fácil lectura**: Tipografía clara y tamaños apropiados
- **Datos financieros**: Formato de moneda en pesos colombianos

## 🚀 Cómo Usar

### 1. Acceso a la Funcionalidad
1. Navega a la pestaña **"Caja"** en la aplicación
2. Busca el botón **"📄 Generar Reporte PDF"** en la parte superior
3. Haz clic en el botón para generar el reporte del día actual

### 2. Descarga Automática
- El reporte se descarga automáticamente al navegador
- Nombre del archivo: `reporte-diario-YYYYMMDD.pdf`
- Ejemplo: `reporte-diario-20250731.pdf`

### 3. Cuándo Generar el Reporte
Se recomienda generar el reporte:
- **Al cierre de caja diario**
- **Antes de contabilizar el efectivo**
- **Para auditorías internas**
- **Para control administrativo**

## 🔧 Configuración Técnica

### Endpoint API
```
GET /api/reporte-diario/:fecha
```

**Parámetros:**
- `fecha`: Fecha en formato YYYY-MM-DD

**Respuesta:**
- Tipo: `application/pdf`
- Archivo PDF listo para descarga

### Ejemplo de Uso Programático
```javascript
// Generar reporte para hoy
const hoy = new Date().toISOString().split('T')[0];
const response = await fetch(`/api/reporte-diario/${hoy}`);
const blob = await response.blob();

// Crear enlace de descarga
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `reporte-diario-${hoy.replace(/-/g, '')}.pdf`;
a.click();
```

## 📋 Estructura del Reporte

### 1. Encabezado
- Nombre del establecimiento
- Fecha del reporte
- Hora de generación

### 2. Resumen Ejecutivo
- Monto inicial de caja
- Total de ventas del día
- Total de gastos
- Ganancia neta

### 3. Análisis por Método de Pago
- **Efectivo**: Monto inicial + ventas - gastos = efectivo esperado
- **Tarjeta**: Total de ventas con tarjeta
- **Transferencias**: Total de ventas por transferencia

### 4. Detalle de Transacciones
- **Ventas Locales**: Hora, monto, método de pago
- **Órdenes de Delivery**: Hora, cliente, montos, método de pago

### 5. Registro de Gastos
- Hora, concepto, monto de cada gasto

## 🛠️ Dependencias Instaladas

- `puppeteer`: Para generación de PDFs desde HTML
- Dependencias del sistema para Chrome/Chromium

## 💡 Consejos de Uso

1. **Consistencia**: Genera el reporte todos los días a la misma hora
2. **Archivo**: Guarda los reportes en una carpeta organizada por fechas
3. **Verificación**: Usa el reporte para verificar el efectivo físico en caja
4. **Auditoría**: Mantén los reportes como respaldo para auditorías

## 🔒 Seguridad

- Los reportes solo incluyen datos del día solicitado
- No se almacenan copias del PDF en el servidor
- Los datos se obtienen en tiempo real de la base de datos

## 📞 Soporte

Para cualquier problema con la generación de reportes:
1. Verificar que el servidor esté funcionando correctamente
2. Comprobar que hay datos para la fecha solicitada
3. Revisar la consola del navegador para errores
4. Contactar al administrador del sistema si persisten los problemas
