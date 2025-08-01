# Configuración de Deployment Automático

Este proyecto está configurado para hacer deployment automático al servidor Amber VPS cuando se hacen cambios en el branch `main`.

## Configuración Inicial en el Servidor

### 1. Ejecutar el script de configuración

En el servidor Amber VPS, ejecutar una sola vez:

```bash
# Descargar el script
wget https://raw.githubusercontent.com/marcelino056/comedor-delivery-app/main/setup-server.sh

# Hacerlo ejecutable
chmod +x setup-server.sh

# Ejecutar la configuración
sudo ./setup-server.sh
```

### 2. Configurar GitHub Secrets

En el repositorio de GitHub, ir a **Settings > Secrets and variables > Actions** y agregar:

| Secret | Descripción | Valor |
|--------|-------------|-------|
| `VPS_HOST` | IP del servidor Amber VPS | `tu-ip-del-servidor` |
| `VPS_USER` | Usuario SSH | `root` |
| `VPS_SSH_KEY` | Clave privada SSH | `contenido-de-la-clave-privada` |
| `VPS_PORT` | Puerto SSH (opcional) | `22` |

### 3. Generar clave SSH (si no existe)

En tu máquina local:

```bash
# Generar clave SSH
ssh-keygen -t rsa -b 4096 -C "deploy@comedor-delivery-app"

# Copiar clave pública al servidor
ssh-copy-id root@tu-ip-del-servidor

# Copiar clave privada para GitHub
cat ~/.ssh/id_rsa
```

## Cómo Funciona

1. **Push to main**: Cuando se hace push al branch `main`
2. **GitHub Actions**: Se ejecuta automáticamente el workflow
3. **Deploy**: El código se actualiza en el servidor
4. **Restart**: El servicio se reinicia automáticamente
5. **Verification**: Se verifica que la aplicación esté funcionando

## Comandos Útiles en el Servidor

```bash
# Ver logs en tiempo real
sudo journalctl -u comedor-delivery-app -f

# Reiniciar el servicio
sudo systemctl restart comedor-delivery-app

# Ver estado del servicio
sudo systemctl status comedor-delivery-app

# Parar el servicio
sudo systemctl stop comedor-delivery-app

# Verificar conectividad
curl http://localhost:3005
```

## Estructura del Deployment

```
/opt/comedor-delivery-app/     # Código de la aplicación
/opt/backups/                  # Backups automáticos
/etc/systemd/system/           # Configuración del servicio
```

## Troubleshooting

### El servicio no inicia
```bash
# Ver logs detallados
sudo journalctl -u comedor-delivery-app -n 50

# Verificar MongoDB
sudo systemctl status mongod

# Verificar permisos
sudo chown -R root:root /opt/comedor-delivery-app
```

### El deployment falla
1. Verificar que los GitHub Secrets estén configurados correctamente
2. Verificar conectividad SSH al servidor
3. Revisar los logs del workflow en GitHub Actions

### La aplicación no responde
```bash
# Verificar el puerto
sudo netstat -tlnp | grep :3005

# Verificar procesos
sudo ps aux | grep node

# Reiniciar completamente
sudo systemctl restart comedor-delivery-app
```

## Rollback Manual

Si algo sale mal, puedes hacer rollback:

```bash
# Ver backups disponibles
ls -la /opt/backups/

# Restaurar backup
sudo systemctl stop comedor-delivery-app
sudo rm -rf /opt/comedor-delivery-app
sudo cp -r /opt/backups/comedor-delivery-app-YYYYMMDD-HHMMSS /opt/comedor-delivery-app
sudo systemctl start comedor-delivery-app
```
