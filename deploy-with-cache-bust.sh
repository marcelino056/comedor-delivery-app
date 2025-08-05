#!/bin/bash

# Script para invalidar caché y deploy con PWA
# Este script debe ejecutarse en cada deploy

echo "🚀 Iniciando deploy con invalidación de caché..."

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

# 1. Generar nuevo timestamp para versión de caché
TIMESTAMP=$(date +%s)
log_info "Generando nueva versión de caché: $TIMESTAMP"

# 2. Actualizar service worker con nueva versión
SW_FILE="public/sw.js"
if [ -f "$SW_FILE" ]; then
    # Reemplazar el timestamp en el service worker
    sed -i "s/const CACHE_VERSION = new Date().getTime();/const CACHE_VERSION = $TIMESTAMP;/" "$SW_FILE"
    log_success "Service worker actualizado con nueva versión: $TIMESTAMP"
else
    log_error "No se encontró el archivo $SW_FILE"
    exit 1
fi

# 3. Actualizar manifest.json con nuevo timestamp para forzar re-download
MANIFEST_FILE="public/manifest.json"
if [ -f "$MANIFEST_FILE" ]; then
    # Crear backup del manifest
    cp "$MANIFEST_FILE" "${MANIFEST_FILE}.backup"
    
    # Agregar parámetro de versión al manifest (o actualizarlo si existe)
    if grep -q '"version"' "$MANIFEST_FILE"; then
        sed -i "s/\"version\": \"[^\"]*\"/\"version\": \"$TIMESTAMP\"/" "$MANIFEST_FILE"
    else
        # Agregar versión antes del último }
        sed -i '$i\  ,"version": "'$TIMESTAMP'"' "$MANIFEST_FILE"
    fi
    log_success "Manifest.json actualizado con versión: $TIMESTAMP"
fi

# 4. Crear archivo de versión para el frontend
VERSION_FILE="public/version.json"
cat > "$VERSION_FILE" << EOF
{
  "version": "$TIMESTAMP",
  "deployDate": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "commit": "$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')",
  "branch": "$(git branch --show-current 2>/dev/null || echo 'unknown')"
}
EOF
log_success "Archivo de versión creado: $VERSION_FILE"

# 5. Commit cambios si estamos en git
if [ -d ".git" ]; then
    log_info "Commiteando cambios de versión..."
    git add "$SW_FILE" "$MANIFEST_FILE" "$VERSION_FILE" 2>/dev/null
    git commit -m "chore: update cache version to $TIMESTAMP [skip ci]" 2>/dev/null || log_warning "No hay cambios para commitear"
fi

# 6. Restart PM2 si está disponible
if command -v pm2 &> /dev/null; then
    log_info "Reiniciando aplicación con PM2..."
    pm2 restart ecosystem.config.js --update-env
    log_success "PM2 reiniciado"
else
    log_warning "PM2 no encontrado, saltando reinicio automático"
fi

# 7. Verificar nginx y reload si está disponible
if command -v nginx &> /dev/null; then
    log_info "Recargando configuración de Nginx..."
    sudo nginx -t && sudo systemctl reload nginx
    log_success "Nginx recargado"
else
    log_warning "Nginx no encontrado o sin permisos sudo"
fi

# 8. Mostrar información de deploy
log_success "Deploy completado con nueva versión: $TIMESTAMP"
log_info "Archivos actualizados:"
log_info "  - $SW_FILE (nueva versión de caché)"
log_info "  - $MANIFEST_FILE (manifest actualizado)"
log_info "  - $VERSION_FILE (información de versión)"

# 9. Instrucciones para usuarios
echo ""
log_info "📱 Para usuarios que experimenten caché:"
log_info "  1. Abrir la aplicación"
log_info "  2. Agregar '?debug=true' a la URL para ver el botón de actualización forzada"
log_info "  3. O presionar Ctrl+F5 (o Cmd+Shift+R en Mac) para forzar recarga"
log_info "  4. En móviles: cerrar completamente la app y volver a abrirla"

echo ""
log_success "🎉 Deploy completado exitosamente!"
