# 🍽️ Comedor & Delivery App - MongoDB Edition

Sistema de gestión completo para comedores con servicio de delivery. PWA (Progressive Web App) con sincronización en tiempo real y funcionamiento offline. **Ahora con MongoDB como base de datos.**

## ✨ Características

### 🏪 Gestión Completa
- **Ventas locales**: Registro rápido de ventas en el comedor
- **Delivery**: Gestión completa de pedidos con seguimiento de estados
- **Control de caja**: Cuadre automático por método de pago
- **Filtros inteligentes**: Organización por estado de pedidos
- **Multi-dispositivo**: Hasta 4 dispositivos sincronizados en tiempo real

### 📱 Tecnología Moderna
- **PWA**: Instalable como app nativa en iPhone/Android
- **Offline**: Funciona sin conexión a internet
- **Tiempo real**: Sincronización automática vía WebSocket
- **Responsive**: Optimizado para móviles y tablets

### 💰 Control Financiero
- Monto inicial diario para cuadre perfecto
- Separación por método de pago (efectivo, tarjeta, transferencia)
- Registro de gastos con auditoría completa
- Cálculo automático de ganancias
- **📄 Reportes PDF diarios**: Generación automática de reportes de cierre de caja

## 🚀 Instalación

### Requisitos Previos
- Node.js 18+
- MongoDB 7.0+
- Nginx (opcional, para producción)
- PM2 (opcional, para producción)

### Desarrollo Local
```bash
# Clonar repositorio
git clone https://github.com/marcelino056/comedor-delivery-app.git
cd comedor-delivery-app

# Instalar dependencias
npm install

# Asegurar que MongoDB esté corriendo
sudo systemctl start mongod

# Ejecutar en desarrollo
npm start
```

La aplicación estará disponible en `http://localhost:3005`

### Despliegue en Producción

#### 1. Instalar MongoDB
```bash
# Ubuntu/Debian
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update
sudo apt install -y mongodb-org

# Iniciar y habilitar MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
```

#### 2. Preparar aplicación
```bash
# Instalar dependencias de producción
npm install --production

# Iniciar con PM2
pm2 start server.js --name comedor-app
pm2 save
pm2 startup
```

#### 3. Configurar Nginx (opcional)
```nginx
server {
    listen 80;
    server_name tu-dominio.com;
    
    location / {
        proxy_pass http://localhost:3005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Configuración para archivos estáticos
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        proxy_pass http://localhost:3005;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## 📊 Migración desde SQLite

Si tienes datos existentes en SQLite, incluimos un script de migración:

```bash
# Instalar sqlite3 temporalmente (solo para migración)
npm install sqlite3

# Ejecutar migración
node migrate-sqlite-to-mongodb.js

# Desinstalar sqlite3 (opcional)
npm uninstall sqlite3
```

## 📖 Uso

### Instalación como PWA
1. Abrir la aplicación en el navegador
2. **iPhone**: Safari → Compartir → Agregar a pantalla de inicio
3. **Android**: Chrome → Menú → Agregar a pantalla de inicio

### Flujo Diario
1. **Apertura**: Establecer monto inicial en "Caja"
2. **Operación**: Registrar ventas y pedidos
3. **Seguimiento**: Usar filtros para gestionar delivery
4. **Cierre**: Revisar cuadre automático en "Caja"
5. **📄 Reporte**: Generar reporte PDF diario para archivo y auditoría

## 🛠️ Tecnologías

### Backend
- **Node.js** + Express.js
- **MongoDB** + Mongoose para persistencia
- **WebSocket** para tiempo real
- **CORS** habilitado

### Frontend
- **HTML5** + CSS3 + JavaScript (Vanilla)
- **PWA** con Service Worker
- **WebSocket** cliente
- **Responsive Design**

### Infraestructura
- **PM2** para gestión de procesos
- **Nginx** como proxy reverso
- **MongoDB** como base de datos NoSQL

## 📊 API Endpoints

### Ventas
- `GET /api/ventas` - Obtener todas las ventas
- `POST /api/ventas` - Crear nueva venta
- `PUT /api/ventas/:id/anular` - Anular venta

### Órdenes
- `GET /api/ordenes` - Obtener todas las órdenes
- `POST /api/ordenes` - Crear nueva orden
- `PUT /api/ordenes/:id/estado` - Actualizar estado
- `PUT /api/ordenes/:id/metodoPago` - Cambiar método de pago
- `PUT /api/ordenes/:id/anular` - Anular orden

### Gastos
- `GET /api/gastos` - Obtener todos los gastos
- `POST /api/gastos` - Crear nuevo gasto

### Caja
- `GET /api/monto-inicial/:fecha` - Obtener monto inicial
- `POST /api/monto-inicial` - Establecer monto inicial

### Reportes
- `GET /api/reporte-diario/:fecha` - Generar reporte PDF del día

### Migración
- `POST /api/migrate-from-sqlite` - Migrar datos desde SQLite

## 🔧 Configuración

### Variables de Entorno
```env
PORT=3005
NODE_ENV=production
MONGODB_URI=mongodb://127.0.0.1:27017/comedor_delivery
```

### Estructura de Base de Datos

#### Colecciones MongoDB
- **ventas**: Registro de ventas locales
- **ordenes**: Pedidos de delivery
- **gastos**: Gastos del negocio
- **montoinicials**: Montos iniciales por día

### Estructura de Archivos
```
comedor-delivery-app/
├── server.js                    # Servidor principal (MongoDB)
├── server-sqlite.js.bak         # Backup del servidor SQLite
├── migrate-sqlite-to-mongodb.js # Script de migración
├── package.json                 # Dependencias (MongoDB)
├── public/                      # Frontend (sin cambios)
│   ├── index.html              # Página principal
│   ├── style.css               # Estilos
│   ├── app.js                  # Lógica frontend
│   ├── manifest.json           # PWA manifest
│   └── sw.js                   # Service Worker
├── comedor.db                  # Base de datos SQLite (backup)
└── README.md                   # Este archivo
```

## 🔄 Cambios en esta Versión

### Migración a MongoDB
- ✅ Reemplazado SQLite con MongoDB + Mongoose
- ✅ Mantenida compatibilidad total con frontend
- ✅ Script de migración automática incluido
- ✅ Mejor escalabilidad y rendimiento
- ✅ Esquemas con validación de datos
- ✅ Soporte para réplicas y clustering (futuro)

### Beneficios de MongoDB
- **Escalabilidad**: Soporte nativo para clustering
- **Flexibilidad**: Esquemas adaptables sin migraciones
- **Rendimiento**: Mejor para consultas complejas
- **Herramientas**: MongoDB Compass, Atlas, etc.
- **Documentos**: Estructura más natural para JavaScript

## 📱 Screenshots

*Las capturas de pantalla siguen siendo idénticas ya que el frontend no cambió*

## 🤝 Contribuir

1. Fork del repositorio
2. Crear rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## 🎯 Roadmap

- [x] Migración a MongoDB
- [ ] Índices optimizados para consultas
- [ ] Agregaciones para reportes avanzados
- [ ] Sistema de usuarios y roles
- [ ] Notificaciones push
- [ ] Integración con impresoras térmicas
- [ ] App móvil nativa
- [ ] Integración con sistemas de pago
- [ ] MongoDB Atlas (cloud)

## 📞 Soporte

Para soporte o preguntas:
- Crear un [Issue](https://github.com/marcelino056/comedor-delivery-app/issues)
- Email: [tu-email@ejemplo.com]

---

**Desarrollado con ❤️ para la industria gastronómica**
**Ahora potenciado por MongoDB 🍃**
