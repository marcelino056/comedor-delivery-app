# Sistema de Clientes y Facturación

## Nuevas Funcionalidades Implementadas

### 1. Gestión de Clientes

#### Características:
- **Registro de clientes** con información completa:
  - Nombre (requerido)
  - Teléfono (requerido)
  - RNC (opcional)
  - Dirección
  - Email
- **Búsqueda y filtrado** por nombre, teléfono o RNC
- **Edición** de información de clientes existentes
- **Desactivación** de clientes (soft delete)

#### Cómo usar:
1. Ir a la pestaña **"Clientes"**
2. Hacer clic en **"+ Agregar Cliente"** para registrar un nuevo cliente
3. Llenar el formulario con la información del cliente
4. Usar la barra de búsqueda para encontrar clientes específicos
5. Usar los botones de acción para editar, facturar o desactivar clientes

### 2. Sistema de Facturación

#### Tipos de Comprobantes:
- **BOLETA**: Comprobante simple sin RNC
- **FACTURA**: Comprobante fiscal con RNC (opcional)

#### Características:
- **Generación automática** de números de factura
- **Cálculo automático** de impuestos (ITBIS 18%)
- **Productos múltiples** por factura con cantidades y precios
- **Generación de PDF** profesional
- **Sistema de anulación** con motivos
- **Filtros avanzados** por fecha, tipo y RNC

#### Cómo crear una factura:
1. Ir a la pestaña **"Facturas"**
2. Hacer clic en **"📄 Nueva Factura"**
3. Seleccionar el cliente (o crear uno nuevo)
4. Elegir el tipo de comprobante (BOLETA o FACTURA)
5. Agregar productos/servicios:
   - Descripción
   - Cantidad
   - Precio unitario (el total se calcula automáticamente)
6. Si es FACTURA, marcar si requiere RNC fiscal
7. Hacer clic en **"Generar Factura"**
8. Opcionalmente descargar el PDF

### 3. Gestión de Secuencias RNC

#### Características:
- **Configuración de secuencias** autorizadas por DGII
- **Control automático** de numeración secuencial
- **Seguimiento de uso** y disponibilidad
- **Fechas de vencimiento** de secuencias
- **Activación/desactivación** de secuencias

#### Configurar secuencias RNC:
1. Ir a **Facturas** > **"⚙️ Config. RNC"**
2. Ver secuencias existentes y su estado
3. Agregar nueva configuración:
   - Nombre (ej: B01, B02)
   - Descripción
   - Prefijo
   - Rango de números (inicial y final)
   - Fecha de vencimiento
4. Activar la secuencia para uso

### 4. Reportes para Contabilidad

#### Reporte Mensual de Facturas con RNC:
- **Filtrado automático** de facturas con RNC válido
- **Formato PDF** listo para contabilidad
- **Información completa**: fecha, número, cliente, RNC, monto
- **Total general** del período

#### Generar reporte:
1. Ir a **Facturas** > **"📊 Reporte RNC"**
2. Seleccionar mes y año
3. Hacer clic en **"Descargar Reporte PDF"**

## Integración con Sistema Existente

### Delivery con Clientes Registrados
- Las órdenes de delivery ahora pueden asociarse a clientes registrados
- Facilita la facturación posterior de servicios de delivery
- Mantiene historial de órdenes por cliente

### Facturación de Ventas
- Las ventas locales pueden generar facturas posteriormente
- Ideal para clientes que solicitan comprobante fiscal después de la compra

## Estructura de Base de Datos

### Nuevas Colecciones MongoDB:
- **clientes**: Información de clientes
- **facturas**: Facturas y boletas generadas
- **configuracionrnc**: Configuraciones de secuencias RNC

### Campos Importantes:

#### Cliente:
```javascript
{
  nombre: String (requerido),
  telefono: String (requerido),
  rnc: String (opcional),
  direccion: String,
  email: String,
  activo: Boolean
}
```

#### Factura:
```javascript
{
  numero: String (único),
  tipoComprobante: "FACTURA" | "BOLETA",
  cliente: ObjectId (referencia),
  productos: [{
    descripcion: String,
    cantidad: Number,
    precioUnitario: Number,
    total: Number
  }],
  subtotal: Number,
  impuesto: Number (18%),
  total: Number,
  rnc: String,
  secuencia: String,
  anulada: Boolean
}
```

## API Endpoints Agregados

### Clientes:
- `GET /api/clientes` - Obtener todos los clientes
- `POST /api/clientes` - Crear nuevo cliente
- `PUT /api/clientes/:id` - Actualizar cliente
- `DELETE /api/clientes/:id` - Desactivar cliente

### Facturas:
- `GET /api/facturas` - Obtener facturas con filtros
- `POST /api/facturas` - Crear nueva factura
- `GET /api/facturas/:id/pdf` - Descargar PDF de factura
- `PUT /api/facturas/:id/anular` - Anular factura

### Configuración RNC:
- `GET /api/configuracion-rnc` - Obtener configuraciones
- `POST /api/configuracion-rnc` - Crear configuración

### Reportes:
- `GET /api/reportes/facturas-rnc` - Reporte mensual RNC

## Beneficios del Sistema

1. **Cumplimiento Fiscal**: Control total de secuencias RNC según DGII
2. **Profesionalismo**: Facturas PDF profesionales con cálculos automáticos
3. **Eficiencia**: Base de datos de clientes para facturación rápida
4. **Trazabilidad**: Historial completo de facturas y anulaciones
5. **Reportes**: Información lista para contabilidad
6. **Flexibilidad**: Soporte tanto para boletas simples como facturas fiscales

## Próximas Mejoras Sugeridas

- Integración con sistemas contables externos
- Envío automático de facturas por email
- Recordatorios de vencimiento de secuencias
- Dashboard con estadísticas de facturación
- Plantillas personalizables de facturas
