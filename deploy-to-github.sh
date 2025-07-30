#!/bin/bash

echo "🚀 Deploy to GitHub - Comedor & Delivery App"
echo "============================================="
echo ""

# Verificar que estamos en el directorio correcto
if [ ! -f "server.js" ]; then
    echo "❌ Error: Este script debe ejecutarse desde el directorio del proyecto"
    exit 1
fi

echo "📋 Estado actual del repositorio:"
git status
echo ""

echo "📁 Archivos preparados para subir:"
git ls-files | grep -v node_modules | head -20
echo ""

echo "⚠️  IMPORTANTE:"
echo "Para subir el código necesitas:"
echo "1. Usuario de GitHub: marcelino056"
echo "2. Personal Access Token (no contraseña)"
echo ""

read -p "¿Quieres proceder con git push? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🔄 Intentando subir código..."
    echo "Se te pedirá:"
    echo "- Username: marcelino056"
    echo "- Password: [Tu GitHub Personal Access Token]"
    echo ""
    
    git push -u origin main
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ ¡Código subido exitosamente!"
        echo "🔗 Ver en: https://github.com/marcelino056/comedor-delivery-app"
    else
        echo ""
        echo "❌ Error al subir. Opciones:"
        echo "1. Verificar credenciales de GitHub"
        echo "2. Subir manualmente desde GitHub.com"
        echo "3. Clonar repo vacío y copiar archivos"
    fi
else
    echo ""
    echo "✅ Operación cancelada"
    echo "💡 Alternativas:"
    echo "1. Ejecutar: git push -u origin main"
    echo "2. Subir desde GitHub.com"
    echo "3. Ver GITHUB_UPLOAD.md para más opciones"
fi
