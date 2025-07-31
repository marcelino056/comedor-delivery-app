# 🍽️ Comedor & Delivery App

Sistema de gestión completo para comedores con servicio de delivery. PWA (Progressive Web App) con sincronización en tiempo real y funcionamiento offline.

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

## 🚀 Instalación

### Requisitos Previos
- Node.js 18+
- SQLite3
- Nginx (opcional, para producción)
- PM2 (opcional, para producción)

### Desarrollo Local
```bash
# Clonar repositorio
git clone https://github.com/marcelino056/comedor-delivery-app.git
cd comedor-delivery-app

# Instalar dependencias
npm install

# Ejecutar en desarrollo
npm start
```

La aplicación estará disponible en `http://localhost:3000`

### Despliegue en Producción

#### 1. Preparar aplicación
```bash
# Instalar dependencias de producción
npm install --production

# Iniciar con PM2
pm2 start server.js --name comedor-app
pm2 save
pm2 startup
```

#### 2. Configurar Nginx (opcional)
```nginx
server {
    listen 80;
    server_name tu-dominio.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Configuración para archivos estáticos
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        proxy_pass http://localhost:3000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
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

## 🛠️ Tecnologías

### Backend
- **Node.js** + Express.js
- **SQLite** para persistencia
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
- **SQLite** para base de datos

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

## 🔧 Configuración

### Variables de Entorno
```env
PORT=3000
NODE_ENV=production
DB_PATH=./comedor.db
```

### Estructura de Archivos
```
comedor-delivery-app/
├── server.js              # Servidor principal
├── package.json           # Dependencias
├── public/                # Frontend
│   ├── index.html         # Página principal
│   ├── style.css          # Estilos
│   ├── app.js             # Lógica frontend
│   ├── manifest.json      # PWA manifest
│   └── sw.js              # Service Worker
├── comedor.db             # Base de datos SQLite
└── README.md              # Este archivo
```

## 📱 Screenshots

*Próximamente: capturas de pantalla de la aplicación*

## 🤝 Contribuir

1. Fork del repositorio
2. Crear rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## 🎯 Roadmap

- [ ] Sistema de usuarios y roles
- [ ] Reportes avanzados con gráficos
- [ ] Notificaciones push
- [ ] Integración con impresoras térmicas
- [ ] App móvil nativa
- [ ] Integración con sistemas de pago

## 📞 Soporte

Para soporte o preguntas:
- Crear un [Issue](https://github.com/marcelino056/comedor-delivery-app/issues)
- Email: [tu-email@ejemplo.com]

---

**Desarrollado con ❤️ para la industria gastronómica**
