# 🚀 Configuración de Deployment Automático - RESUMEN

## ✅ Lo que hemos configurado:

### 1. **GitHub Actions Workflow** (.github/workflows/deploy.yml)
- Se ejecuta automáticamente cuando se hace push a `main`
- Actualiza el código en `/var/www/comedor-app`
- Reinicia la aplicación con PM2
- Hace backup automático antes del deployment

### 2. **Configuración PM2** (ecosystem.config.js)
- Aplicación: `comedor-app`
- Puerto: `3007` (puerto original del servidor)
- Logs: `/var/log/pm2/`
- Auto-restart en caso de fallos

### 3. **Scripts de Setup**
- `setup-server.sh`: Configuración inicial del servidor
- `test-deployment.sh`: Prueba del proceso de deployment

### 4. **Package.json actualizado**
- Scripts PM2 agregados
- Comandos para testing y deployment

## 🔧 Para completar la configuración:

### 1. **Configurar GitHub Secrets**
En GitHub → Settings → Secrets and variables → Actions, agregar:

```
VPS_HOST: [IP del servidor Amber VPS]
VPS_USER: root
VPS_SSH_KEY: [Clave privada SSH]
VPS_PORT: 22
```

### 2. **Aplicar cambios en el servidor**
```bash
# En el servidor, mantener puerto 3007
cd /var/www/comedor-app
sudo pm2 stop comedor-app
sudo git pull origin main
sudo pm2 start ecosystem.config.js
sudo pm2 save
```

### 3. **Probar el deployment**
- Hacer un commit y push a `main`
- Verificar en GitHub Actions que el workflow se ejecute
- Verificar que la aplicación responda en puerto 3007

## 📋 Comandos útiles:

```bash
# En el servidor
sudo pm2 status                    # Ver estado
sudo pm2 logs comedor-app          # Ver logs
sudo pm2 restart comedor-app       # Reiniciar
sudo pm2 monit                     # Monitor en tiempo real

# Verificar conectividad
curl http://localhost:3007
```

## 🎯 Próximos pasos:

1. **Configurar GitHub Secrets** (¡IMPORTANTE!)
2. **Hacer push de estos cambios a main** para probar el workflow
3. **Verificar que todo funcione correctamente**

La configuración está lista para el deployment automático. Cada vez que hagas push a `main`, se actualizará automáticamente en el servidor.
