# 🧹 Sistema de Limpieza de Base de Datos

Este sistema proporciona herramientas seguras para limpiar datos específicos de la base de datos del comedor delivery.

## ⚠️ ADVERTENCIAS IMPORTANTES

- **TODAS las operaciones de eliminación son IRREVERSIBLES**
- **SIEMPRE haz un backup antes de usar en producción**
- Las funciones requieren confirmación explícita para ejecutarse
- Algunas operaciones requieren códigos de seguridad adicionales

## 📁 Archivos del Sistema

- `utils/cleanDatabase.js` - Funciones de limpieza
- `scripts/clean-database.js` - Script de línea de comandos
- `routes/cleanRoutes.js` - Endpoints API para limpieza
- `docs/LIMPIEZA_BD.md` - Esta documentación

## 🖥️ Uso por Línea de Comandos

### Mostrar estadísticas
```bash
node scripts/clean-database.js --stats
```

### Limpiar tablas específicas
```bash
# Limpiar todas las ventas
node scripts/clean-database.js --clean-ventas --confirm

# Limpiar todas las órdenes
node scripts/clean-database.js --clean-ordenes --confirm

# Limpiar todos los clientes
node scripts/clean-database.js --clean-clientes --confirm

# Limpiar todas las facturas
node scripts/clean-database.js --clean-facturas --confirm

# Limpiar todos los conduces
node scripts/clean-database.js --clean-conduces --confirm

# Limpiar todos los gastos
node scripts/clean-database.js --clean-gastos --confirm

# Limpiar montos iniciales
node scripts/clean-database.js --clean-montos --confirm
```

### Limpiezas masivas
```bash
# Limpiar solo datos transaccionales (mantiene clientes y configuraciones)
node scripts/clean-database.js --clean-transaccional --confirm

# Limpiar TODO (requiere código de seguridad)
node scripts/clean-database.js --clean-todo --confirm --safety-code CONFIRMO_ELIMINAR_TODO
```

### Limpiar por rango de fechas
```bash
# Eliminar datos entre fechas específicas
node scripts/clean-database.js --clean-fechas 2025-08-01 2025-08-03 --confirm
```

## 🌐 Uso por API

### Configuración de Seguridad

Las rutas API requieren autenticación. Configura la variable de entorno:
```bash
export ADMIN_KEY="tu_clave_secreta_aqui"
```

O pasa la clave en el header o query parameter:
```bash
# Header
curl -H "x-admin-key: tu_clave" http://localhost:3007/api/admin/clean/stats

# Query parameter  
curl http://localhost:3007/api/admin/clean/stats?adminKey=tu_clave
```

### Endpoints Disponibles

#### Obtener estadísticas
```bash
GET /api/admin/clean/stats
```

#### Limpiar tablas específicas
```bash
# Todas requieren POST con { "confirm": true }
POST /api/admin/clean/ventas
POST /api/admin/clean/ordenes  
POST /api/admin/clean/clientes
POST /api/admin/clean/facturas
POST /api/admin/clean/conduces
POST /api/admin/clean/gastos
POST /api/admin/clean/montos
```

#### Limpiezas masivas
```bash
# Limpiar datos transaccionales
POST /api/admin/clean/transaccional
Body: { "confirm": true }

# Limpiar por fechas
POST /api/admin/clean/fechas
Body: { 
  "fechaInicio": "2025-08-01", 
  "fechaFin": "2025-08-03", 
  "confirm": true 
}

# Limpiar TODO (muy peligroso)
POST /api/admin/clean/todo
Body: { 
  "confirm": true, 
  "safetyCode": "CONFIRMO_ELIMINAR_TODO" 
}
```

## 📝 Ejemplos de Uso Prácticos

### Ejemplo 1: Limpiar datos de prueba
```bash
# 1. Ver estadísticas actuales
node scripts/clean-database.js --stats

# 2. Limpiar solo datos transaccionales (mantener clientes)
node scripts/clean-database.js --clean-transaccional --confirm

# 3. Verificar que solo quedaron clientes y configuraciones
node scripts/clean-database.js --stats
```

### Ejemplo 2: Limpiar día específico
```bash
# Eliminar todos los datos del 1 de agosto
node scripts/clean-database.js --clean-fechas 2025-08-01 2025-08-01 --confirm
```

### Ejemplo 3: Reset completo para nueva temporada
```bash
# ⚠️ ESTO ELIMINA TODO
node scripts/clean-database.js --clean-todo --confirm --safety-code CONFIRMO_ELIMINAR_TODO
```

### Ejemplo 4: Via API con curl
```bash
# Ver estadísticas
curl -H "x-admin-key: admin123" http://localhost:3007/api/admin/clean/stats

# Limpiar ventas
curl -X POST \
  -H "Content-Type: application/json" \
  -H "x-admin-key: admin123" \
  -d '{"confirm": true}' \
  http://localhost:3007/api/admin/clean/ventas
```

## 🔒 Funciones de Seguridad

### Niveles de Protección

1. **Confirmación Requerida**: Todas las funciones requieren `confirm=true`
2. **Códigos de Seguridad**: Operaciones peligrosas requieren códigos especiales
3. **Autenticación API**: Los endpoints requieren clave de administrador
4. **Entorno**: Algunas operaciones solo funcionan en desarrollo

### Códigos de Seguridad

- `CONFIRMO_ELIMINAR_TODO` - Requerido para eliminar toda la base de datos

## 🚨 Escenarios de Uso Recomendados

### ✅ Casos Seguros
- Limpiar datos de prueba en desarrollo
- Eliminar registros de fechas específicas
- Limpiar solo datos transaccionales antes de nueva temporada
- Eliminar gastos incorrectos

### ⚠️ Casos que Requieren Precaución
- Limpiar clientes (se pierden todos los contactos)
- Limpiar configuraciones (se pierden configuraciones de empresa/RNC)
- Operaciones en producción

### 🚨 Casos Peligrosos
- Usar `--clean-todo` en producción
- Limpiar sin hacer backup primero
- Usar códigos de seguridad sin entender las consecuencias

## 🔧 Integración en el Código

### Uso Programático
```javascript
const { 
  limpiarDatosTransaccionales, 
  mostrarEstadisticas 
} = require('./utils/cleanDatabase');

// En una función async
async function resetearDiario() {
  const statsAntes = await mostrarEstadisticas();
  console.log('Antes:', statsAntes);
  
  const resultado = await limpiarDatosTransaccionales(true);
  console.log('Eliminado:', resultado);
  
  const statsDespues = await mostrarEstadisticas();
  console.log('Después:', statsDespues);
}
```

## 📊 Monitoreo

### Logs de Operaciones
Todas las operaciones generan logs detallados:
```
🧹 Iniciando limpieza de datos transaccionales...
🗑️ Eliminadas 150 ventas
🗑️ Eliminadas 45 órdenes
🗑️ Eliminadas 12 facturas
🗑️ Eliminados 8 conduces
🗑️ Eliminados 23 gastos
🗑️ Eliminados 3 montos iniciales
🔄 Reseteados saldos de 25 clientes
✅ Limpieza de datos transaccionales completada
```

### Estadísticas Antes/Después
Siempre ejecuta `--stats` antes y después de limpiezas importantes.

## 🆘 Recuperación de Datos

### Si Eliminaste Datos por Error
1. **Detén la aplicación inmediatamente**
2. **Restaura desde el backup más reciente**
3. **No hagas más operaciones hasta restaurar**

### Backups Recomendados
```bash
# Backup antes de limpiezas importantes
mongodump --db comedor --out backup-$(date +%Y%m%d)
```

## 🔮 Funcionalidades Futuras

- [ ] Backup automático antes de limpiezas
- [ ] Papelera de reciclaje para datos eliminados
- [ ] Programación de limpiezas automáticas
- [ ] Interface web para administración
- [ ] Logs de auditoría detallados
