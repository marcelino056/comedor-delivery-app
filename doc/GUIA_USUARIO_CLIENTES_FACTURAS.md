# Guía de Usuario - Sistema de Clientes y Facturación

## Acceso a las Nuevas Funcionalidades

Al abrir la aplicación, ahora verás **5 pestañas** en la navegación principal:

1. **🛒 Ventas** - Sistema de ventas locales (existente)
2. **📦 Delivery** - Gestión de órdenes delivery (existente)
3. **👥 Clientes** - ¡NUEVO! Gestión de clientes
4. **📄 Facturas** - ¡NUEVO! Sistema de facturación
5. **💰 Caja** - Control de caja (existente)

---

## 👥 GESTIÓN DE CLIENTES

### Agregar un Cliente Nuevo

1. **Ir a la pestaña "Clientes"**
2. **Hacer clic en el botón verde "+ Agregar Cliente"**
3. **Llenar el formulario:**
   - **Nombre** (obligatorio): Nombre completo del cliente
   - **Teléfono** (obligatorio): Número de contacto
   - **RNC** (opcional): Solo si el cliente lo tiene para facturación
   - **Dirección** (opcional): Para delivery o información de contacto
   - **Email** (opcional): Para futuras funcionalidades
4. **Hacer clic en "Guardar Cliente"**

### Buscar Clientes

- **Usar la barra de búsqueda** en la parte superior
- **Puedes buscar por:**
  - Nombre del cliente
  - Número de teléfono
  - RNC

### Editar un Cliente

1. **Encontrar el cliente** en la lista o usando la búsqueda
2. **Hacer clic en "✏️ Editar"**
3. **Modificar la información** necesaria
4. **Guardar los cambios**

### Desactivar un Cliente

- **Hacer clic en "🗑️ Desactivar"**
- **Confirmar la acción**
- El cliente no se borra, solo se oculta de la lista principal

---

## 📄 SISTEMA DE FACTURACIÓN

### Crear una Factura Nueva

#### Opción 1: Desde la pestaña Facturas
1. **Ir a la pestaña "Facturas"**
2. **Hacer clic en "📄 Nueva Factura"**

#### Opción 2: Desde un cliente específico
1. **Ir a la pestaña "Clientes"**
2. **Buscar el cliente**
3. **Hacer clic en "📄 Facturar"** en la tarjeta del cliente

### Llenar la Información de la Factura

1. **Seleccionar el Cliente:**
   - Elegir de la lista desplegable
   - O hacer clic en "+ Agregar nuevo cliente" si no existe

2. **Elegir Tipo de Comprobante:**
   - **BOLETA**: Para comprobante simple (sin RNC)
   - **FACTURA**: Para comprobante fiscal (con o sin RNC)

3. **Si eligió FACTURA:**
   - Aparecerá la opción "Requiere RNC para facturación fiscal"
   - Marcar **SOLO** si el cliente necesita el RNC para efectos fiscales

4. **Agregar Productos/Servicios:**
   - **Descripción**: Qué se vendió (ej: "Almuerzo Ejecutivo", "Hamburguesa + Papas")
   - **Cantidad**: Número de unidades
   - **Precio**: Precio por unidad
   - **Total**: Se calcula automáticamente
   
5. **Agregar más productos:**
   - Hacer clic en "+ Agregar Producto"
   - Para eliminar un producto, usar el botón "🗑️"

6. **Verificar Totales:**
   - **Subtotal**: Suma de todos los productos
   - **ITBIS (18%)**: Impuesto calculado automáticamente
   - **TOTAL**: Monto final a pagar

7. **Generar la Factura:**
   - Hacer clic en "Generar Factura"
   - El sistema preguntará si desea descargar el PDF

### Descargar PDF de Factura

- **Desde la lista de facturas:** Hacer clic en "📄 PDF"
- **Al crear la factura:** El sistema pregunta automáticamente

### Anular una Factura

1. **Encontrar la factura** en la lista
2. **Hacer clic en "❌ Anular"**
3. **Escribir el motivo** de anulación
4. **Confirmar la anulación**

**Nota:** Las facturas anuladas aparecen marcadas y no se pueden modificar.

---

## ⚙️ CONFIGURACIÓN DE SECUENCIAS RNC

### ¿Qué son las Secuencias RNC?

Son rangos de números autorizados por la DGII para emitir facturas fiscales válidas. Cada secuencia tiene:
- Un **prefijo** (ej: B01, B02)
- Un **rango de números** (ej: del 1 al 50,000)
- Una **fecha de vencimiento**

### Configurar una Nueva Secuencia

1. **Ir a Facturas > "⚙️ Config. RNC"**
2. **Llenar la información:**
   - **Nombre**: Identificador interno (ej: B01, B02)
   - **Descripción**: Descripción clara del uso
   - **Prefijo**: Prefijo que aparece en la factura (ej: B01)
   - **Número Inicial**: Primer número a usar (normalmente 1)
   - **Número Final**: Último número autorizado
   - **Fecha de Vencimiento**: Hasta cuándo es válida la secuencia
   - **Activar**: Marcar para usar esta secuencia

3. **Guardar la configuración**

### Monitorear el Uso de Secuencias

En la configuración RNC puedes ver:
- **Estado actual** de cada secuencia (Activa/Inactiva)
- **Progreso de uso** (cuántos números se han usado)
- **Números disponibles** restantes
- **Fecha de vencimiento**

---

## 📊 REPORTES PARA CONTABILIDAD

### Generar Reporte Mensual de Facturas con RNC

1. **Ir a Facturas > "📊 Reporte RNC"**
2. **Seleccionar el mes y año** deseado
3. **Hacer clic en "Descargar Reporte PDF"**

**El reporte incluye:**
- Todas las facturas con RNC del período
- Fecha, número de factura, cliente, RNC y monto
- Total general del período
- Formato listo para entregar a contabilidad

---

## 🔍 FILTROS Y BÚSQUEDAS EN FACTURAS

### Filtrar Facturas por Período

- **Hoy**: Solo facturas del día actual
- **Este mes**: Facturas del mes en curso
- **Personalizado**: Seleccionar rango de fechas específico

### Filtrar por Tipo

- **Todos**: Mostrar facturas y boletas
- **Facturas**: Solo comprobantes fiscales
- **Boletas**: Solo comprobantes simples

### Filtrar por RNC

- **Todos**: Mostrar todas las facturas
- **Solo con RNC**: Mostrar únicamente facturas que tienen RNC

---

## 💡 CONSEJOS Y MEJORES PRÁCTICAS

### Para Clientes
- **Registrar clientes frecuentes** facilita la facturación posterior
- **Mantener actualizada la información** especialmente teléfonos
- **Registrar RNC** de clientes empresariales para facturación fiscal

### Para Facturación
- **Verificar datos del cliente** antes de generar la factura
- **Usar BOLETA** para ventas simples sin requerimientos fiscales
- **Usar FACTURA con RNC** solo cuando el cliente lo necesite para efectos fiscales
- **Revisar totales** antes de generar la factura

### Para Secuencias RNC
- **Configurar las secuencias** tan pronto las reciba de DGII
- **Monitorear el uso** regularmente para solicitar nuevas secuencias a tiempo
- **Mantener solo una secuencia activa** a la vez para evitar confusiones

### Para Reportes
- **Generar reportes mensuales** antes del día 10 del mes siguiente
- **Mantener archivos organizados** por mes y año
- **Verificar totales** con los reportes de caja diarios

---

## ❓ SOLUCIÓN DE PROBLEMAS COMUNES

### "No hay secuencias RNC disponibles"
- **Verificar** que tenga una secuencia activa configurada
- **Revisar** que la secuencia no haya llegado al límite
- **Configurar** una nueva secuencia si es necesario

### No aparece el cliente en la lista
- **Verificar** que el cliente no esté desactivado
- **Usar la búsqueda** por nombre, teléfono o RNC
- **Crear un cliente nuevo** si no existe

### Error al generar PDF
- **Intentar nuevamente** después de unos segundos
- **Verificar** que todos los datos estén completos
- **Contactar soporte** si el problema persiste

### Factura generada con información incorrecta
- **Anular la factura** con el motivo correspondiente
- **Crear una nueva factura** con la información correcta
- **No es posible editar** una factura ya generada por requerimientos fiscales

---

## 📞 SOPORTE

Si tiene dudas o problemas con el sistema:
1. **Revisar esta guía** para soluciones comunes
2. **Verificar** que esté usando la versión más reciente
3. **Contactar al administrador** del sistema para soporte técnico
