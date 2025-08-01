#!/bin/bash

# Script de prueba del deployment automático
# Este script simula lo que hará GitHub Actions

echo "🧪 Probando deployment automático..."

# Variables
PROJECT_DIR="/var/www/comedor-app"
BACKUP_DIR="/var/www/backups"
SERVICE_NAME="comedor-app"

echo "📂 Navegando a $PROJECT_DIR"
cd $PROJECT_DIR || {
    echo "❌ Error: Directorio no encontrado"
    exit 1
}

echo "📦 Creando backup de prueba..."
sudo mkdir -p $BACKUP_DIR
sudo cp -r . $BACKUP_DIR/test-backup-$(date +%Y%m%d-%H%M%S)

echo "⏹️  Deteniendo aplicación..."
sudo pm2 stop $SERVICE_NAME || echo "⚠️  Aplicación no estaba corriendo"

echo "📥 Simulando actualización de código..."
sudo git status

echo "📦 Verificando dependencias..."
sudo npm ci --production

echo "🔄 Reiniciando aplicación..."
sudo pm2 start ecosystem.config.js || sudo pm2 restart $SERVICE_NAME
sudo pm2 save

echo "⏱️  Esperando 5 segundos..."
sleep 5

echo "🔍 Verificando estado..."
if sudo pm2 show $SERVICE_NAME | grep -q "online"; then
    echo "✅ Aplicación está online"
else
    echo "❌ Error: Aplicación no está online"
    sudo pm2 logs $SERVICE_NAME --lines 10
    exit 1
fi

echo "🌐 Verificando conectividad..."
if curl -f http://localhost:3007 > /dev/null 2>&1; then
    echo "✅ Aplicación responde correctamente"
else
    echo "⚠️  Warning: Aplicación no responde"
fi

echo "📊 Estado final:"
sudo pm2 status

echo "🎉 ¡Prueba completada!"
