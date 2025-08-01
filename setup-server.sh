#!/bin/bash

# Script de configuración inicial para el servidor Amber VPS
# Este script debe ejecutarse UNA VEZ en el servidor para configurar el deployment automático

set -e

echo "🚀 Configurando Comedor Delivery App en Amber VPS..."

# Variables
PROJECT_DIR="/var/www/comedor-app"
BACKUP_DIR="/var/www/backups"
SERVICE_NAME="comedor-app"

# Crear directorios necesarios
echo "📁 Creando directorios..."
sudo mkdir -p $PROJECT_DIR
sudo mkdir -p $BACKUP_DIR

# Clonar el repositorio (si no existe)
if [ ! -d "$PROJECT_DIR/.git" ]; then
    echo "📥 Clonando repositorio..."
    sudo git clone https://github.com/marcelino056/comedor-delivery-app.git $PROJECT_DIR
    sudo chown -R www-data:www-data $PROJECT_DIR
else
    echo "📂 Repositorio ya existe, actualizando..."
    cd $PROJECT_DIR
    sudo git fetch origin
    sudo git reset --hard origin/main
    sudo chown -R www-data:www-data $PROJECT_DIR
fi

# Navegar al directorio del proyecto
cd $PROJECT_DIR

# Instalar dependencias de Node.js
echo "📦 Instalando dependencias..."
sudo npm ci --production

# Verificar y configurar MongoDB
echo "🗄️  Verificando MongoDB..."
if ! systemctl is-active --quiet mongod; then
    echo "📄 Iniciando MongoDB..."
    sudo systemctl start mongod
    sudo systemctl enable mongod
fi

# Configurar PM2 si no está instalado
echo "⚙️  Verificando PM2..."
if ! command -v pm2 &> /dev/null; then
    echo "📦 Instalando PM2..."
    sudo npm install -g pm2
fi

# Configurar PM2 startup
echo "🔄 Configurando PM2 startup..."
sudo pm2 startup
sudo pm2 save

# Crear archivo ecosystem.config.js para PM2
echo "📄 Creando configuración de PM2..."
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: '$SERVICE_NAME',
    script: './server.js',
    cwd: '$PROJECT_DIR',
    instances: 1,
    env: {
      NODE_ENV: 'production',
      PORT: 3005
    },
    error_file: '/var/log/pm2/$SERVICE_NAME-error.log',
    out_file: '/var/log/pm2/$SERVICE_NAME-out.log',
    log_file: '/var/log/pm2/$SERVICE_NAME.log',
    time: true,
    watch: false,
    restart_delay: 5000,
    max_restarts: 10
  }]
};
EOF

# Crear directorio de logs
echo "📁 Creando directorio de logs..."
sudo mkdir -p /var/log/pm2
sudo chown -R www-data:www-data /var/log/pm2

# Configurar firewall (si es necesario)
echo "🔥 Configurando firewall..."
sudo ufw allow 3005/tcp || echo "⚠️  UFW no disponible o ya configurado"

# Detener aplicación anterior si existe
echo "⏹️  Deteniendo aplicación anterior..."
sudo pm2 stop $SERVICE_NAME || echo "⚠️  No había aplicación corriendo"

# Iniciar el servicio con PM2
echo "🔄 Iniciando servicio con PM2..."
sudo pm2 start ecosystem.config.js
sudo pm2 save

# Verificar estado
sleep 5
if sudo pm2 show $SERVICE_NAME | grep -q "online"; then
    echo "✅ Servicio iniciado correctamente"
else
    echo "❌ Error al iniciar el servicio"
    sudo pm2 logs $SERVICE_NAME --lines 20
    exit 1
fi

# Verificar conectividad
echo "🔍 Verificando conectividad..."
sleep 5
if curl -f http://localhost:3005 > /dev/null 2>&1; then
    echo "✅ Aplicación disponible en http://localhost:3005"
else
    echo "⚠️  Warning: Verificar manualmente la conectividad"
fi

echo ""
echo "🎉 ¡Configuración completada!"
echo ""
echo "📋 Comandos útiles:"
echo "   Ver logs:        sudo pm2 logs $SERVICE_NAME"
echo "   Reiniciar:       sudo pm2 restart $SERVICE_NAME"
echo "   Estado:          sudo pm2 status"
echo "   Parar:           sudo pm2 stop $SERVICE_NAME"
echo "   Monitorear:      sudo pm2 monit"
echo ""
echo "🔧 El deployment automático está configurado."
echo "   Los cambios en 'main' se deployarán automáticamente."
