# 🚀 Comedor & Delivery App - Desplegada

## ✅ Estado del Despliegue
- **Fecha**: $(date)
- **Servidor**: Ubuntu 24.04 LTS
- **IP**: 31.97.10.33
- **Puerto de la aplicación**: 8080

## 🌐 URLs de Acceso

### Principal
- **Aplicación**: http://31.97.10.33:8080
- **API Base**: http://31.97.10.33:8080/api
- **WebSocket**: ws://31.97.10.33:3006

### Para dispositivos móviles
1. Abrir http://31.97.10.33:8080 en el navegador
2. Agregar a pantalla de inicio (PWA)
3. ¡Listo! Ya tienes la app instalada

## 🔧 Servicios Configurados

### PM2 (Aplicación Node.js)
- **Puerto**: 3005 (interno)
- **WebSocket**: 3006 (interno)
- **Estado**: pm2 status
- **Logs**: pm2 logs comedor-app
- **Reiniciar**: pm2 restart comedor-app

### Nginx (Proxy)
- **Puerto público**: 8080
- **Configuración**: /etc/nginx/sites-available/comedor-app
- **Estado**: systemctl status nginx
- **Reiniciar**: systemctl restart nginx

### Base de Datos
- **Tipo**: SQLite
- **Ubicación**: /var/www/comedor-app/comedor.db
- **Backup automático**: No configurado aún

## 📱 Funcionalidades Implementadas

### ✅ Completadas
- [x] PWA (Progressive Web App)
- [x] Funcionalidad offline
- [x] Ventas locales
- [x] Órdenes de delivery con estados
- [x] Control de caja completo
- [x] Filtros por estado de pedidos
- [x] Anulación de ventas/órdenes
- [x] Cuadre por método de pago
- [x] Monto inicial de caja
- [x] WebSocket para tiempo real
- [x] API REST completa
- [x] Responsive design para móvil

### 🔄 Próximos Pasos Sugeridos
- [ ] Certificado SSL real (Let's Encrypt)
- [ ] Backup automático de base de datos
- [ ] Reportes avanzados
- [ ] Configuración de dominio personalizado
- [ ] Notificaciones push
- [ ] Sistema de usuarios/roles

## 🚨 Comandos Importantes

### Verificar estado
```bash
pm2 status
systemctl status nginx
```

### Ver logs
```bash
pm2 logs comedor-app
tail -f /var/log/nginx/error.log
```

### Reiniciar servicios
```bash
pm2 restart comedor-app
systemctl restart nginx
```

### Backup manual de base de datos
```bash
cp /var/www/comedor-app/comedor.db /var/www/comedor-app/backup-$(date +%Y%m%d).db
```

## 📞 Soporte
- Los datos se guardan en SQLite local
- La sincronización entre dispositivos funciona via WebSocket
- La aplicación funciona offline y sincroniza cuando hay conexión

---
**¡Tu aplicación de comedor está lista y funcionando! 🎉**
