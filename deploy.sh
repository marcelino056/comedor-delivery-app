#!/bin/bash

# Script para deploy simplificado
# Versión sin PWA

echo "🚀 Iniciando deploy..."

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para logging
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 1. Restart PM2 si está disponible
if command -v pm2 &> /dev/null; then
    log_info "Reiniciando aplicación con PM2..."
    pm2 restart ecosystem.config.js --update-env
    log_success "PM2 reiniciado"
else
    log_warning "PM2 no encontrado, saltando reinicio automático"
fi

# 2. Verificar nginx y reload si está disponible
if command -v nginx &> /dev/null; then
    log_info "Recargando configuración de Nginx..."
    sudo nginx -t && sudo systemctl reload nginx
    log_success "Nginx recargado"
else
    log_warning "Nginx no encontrado o sin permisos sudo"
fi

# 3. Mostrar información de deploy
log_success "Deploy completado"

echo ""
log_success "🎉 Deploy completado exitosamente!"
