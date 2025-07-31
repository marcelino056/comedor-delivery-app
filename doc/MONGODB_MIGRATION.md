# 🔄 Migración a MongoDB - Comedor & Delivery App

## 📅 Fecha de Migración
**Fecha**: 31 de Julio, 2025  
**Versión**: 1.0.0 → 1.1.0 (MongoDB Edition)

## 🎯 Objetivo
Migrar la aplicación de SQLite a MongoDB para mejorar:
- Escalabilidad
- Rendimiento en consultas complejas
- Flexibilidad de esquemas
- Herramientas de administración
- Preparación para clustering futuro

## 🔄 Proceso de Migración

### 1. Instalación de MongoDB
```bash
# Agregar repositorio oficial de MongoDB 7.0
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Instalar MongoDB
sudo apt update
sudo apt install -y mongodb-org

# Configurar e iniciar servicio
sudo systemctl start mongod
sudo systemctl enable mongod
```

### 2. Modificación de Dependencias
**Antes (SQLite):**
```json
{
  "dependencies": {
    "sqlite3": "^5.1.6"
  }
}
```

**Después (MongoDB):**
```json
{
  "dependencies": {
    "mongoose": "^7.5.0"
  }
}
```

### 3. Estructura de Datos

#### Mapeo SQLite → MongoDB

| SQLite (Tabla) | MongoDB (Colección) | Cambios Principales |
|----------------|-------------------|-------------------|
| `ventas` | `ventas` | `id` → `_id`, timestamps automáticos |
| `ordenes` | `ordenes` | `id` → `_id`, validación de enum para estados |
| `gastos` | `gastos` | `id` → `_id`, timestamps automáticos |
| `montoInicial` | `montoinicials` | `id` → `_id`, índice único en fecha |

#### Esquemas MongoDB
```javascript
// Ventas
{
  _id: ObjectId,
  monto: Number (required),
  metodoPago: String (required),
  anulada: Boolean (default: false),
  timestamp: Date (default: now),
  createdAt: Date (auto),
  updatedAt: Date (auto)
}

// Órdenes  
{
  _id: ObjectId,
  cliente: String (required),
  telefono: String (required),
  direccion: String (required),
  descripcion: String (required),
  monto: Number (required),
  costoDelivery: Number (required),
  total: Number (required),
  metodoPago: String (required),
  estado: String (enum: ['recibida', 'preparando', 'en-camino', 'entregada']),
  repartidor: String (required),
  anulada: Boolean (default: false),
  timestamp: Date (default: now),
  createdAt: Date (auto),
  updatedAt: Date (auto)
}
```

### 4. Script de Migración
Se creó `migrate-sqlite-to-mongodb.js` que:
- ✅ Lee todos los datos de SQLite
- ✅ Convierte formatos de fecha
- ✅ Mapea campos apropiadamente
- ✅ Inserta en MongoDB con validación
- ✅ Verifica integridad de datos

**Resultado de migración:**
```
📊 Resumen de migración:
   Ventas: 2
   Órdenes: 1  
   Gastos: 0
   Montos iniciales: 0
```

### 5. Cambios en el Código

#### Backend (server.js)
- ✅ Reemplazado driver `sqlite3` con `mongoose`
- ✅ Definidos esquemas con validación
- ✅ Convertidas todas las consultas SQL a MongoDB
- ✅ Mantenida compatibilidad con WebSocket
- ✅ Agregado endpoint de migración `/api/migrate-from-sqlite`

#### Frontend
- ✅ **Sin cambios necesarios** - API mantiene misma estructura
- ✅ Los IDs ahora son strings (_id de MongoDB) en lugar de números

### 6. Configuración de Producción

#### Variables de Entorno
```bash
# Anterior
DB_PATH=./comedor.db

# Nuevo
MONGODB_URI=mongodb://127.0.0.1:27017/comedor_delivery
```

#### Conexión
```javascript
// Fix específico para evitar IPv6
mongoose.connect('mongodb://127.0.0.1:27017/comedor_delivery', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
```

## ✅ Verificación Post-Migración

### Tests de Funcionamiento
1. **Conexión a MongoDB**: ✅ Exitosa
2. **Migración de datos**: ✅ Completada (2 ventas, 1 orden)
3. **API Endpoints**: ✅ Todos funcionando
4. **WebSocket**: ✅ Tiempo real operativo
5. **Frontend**: ✅ Sin cambios necesarios
6. **PM2 Restart**: ✅ Servicio estable

### Validación de Datos
```bash
# Verificar datos en MongoDB
mongosh comedor_delivery --eval "
  db.ventas.countDocuments(); 
  db.ordenes.countDocuments();
  db.gastos.countDocuments();
  db.montoinicials.countDocuments();
"
```

## 🔧 Mantenimiento

### Backup MongoDB
```bash
# Crear backup
mongodump --db comedor_delivery --out /backup/mongodb/

# Restaurar backup  
mongorestore --db comedor_delivery /backup/mongodb/comedor_delivery/
```

### Monitoreo
```bash
# Estado del servicio
sudo systemctl status mongod

# Logs de MongoDB
sudo tail -f /var/log/mongodb/mongod.log

# Estadísticas de la base de datos
mongosh comedor_delivery --eval "db.stats()"
```

## 🎯 Beneficios Obtenidos

### Rendimiento
- **Consultas más rápidas** para filtros complejos
- **Índices automáticos** en _id y campos únicos
- **Agregaciones nativas** para reportes futuros

### Escalabilidad
- **Sin límites de concurrent writes** como SQLite
- **Preparado para réplicas** y clustering
- **Mejor manejo de múltiples conexiones**

### Desarrollo
- **Validación de esquemas** a nivel de base de datos
- **Tooling mejorado** (MongoDB Compass, Atlas)
- **JSON nativo** - mejor integración con JavaScript

### Operacional
- **Backup incremental** disponible
- **Herramientas de monitoreo** profesionales
- **Configuración flexible** via archivos de configuración

## 📋 Archivos de Backup Conservados

Por seguridad, se mantuvieron los archivos originales:
- `server-sqlite.js.bak` - Servidor original con SQLite
- `package-sqlite.json.bak` - Package.json original  
- `comedor.db` - Base de datos SQLite original
- `README-sqlite.md.bak` - Documentación original

## 🚀 Próximos Pasos

1. **Optimización**: Crear índices específicos para consultas frecuentes
2. **Agregaciones**: Implementar reportes avanzados con MongoDB pipelines
3. **Monitoring**: Configurar alertas y métricas de MongoDB
4. **Clustering**: Preparar configuración para réplicas (si es necesario)
5. **Cloud**: Evaluar migración a MongoDB Atlas

---

✅ **Migración completada exitosamente sin pérdida de datos ni funcionalidad**
