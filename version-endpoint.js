// Endpoint para verificar versión de la aplicación
app.get('/api/version', (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    
    // Leer archivo de versión si existe
    const versionPath = path.join(__dirname, 'public', 'version.json');
    if (fs.existsSync(versionPath)) {
      const versionData = fs.readFileSync(versionPath, 'utf8');
      const version = JSON.parse(versionData);
      res.json(version);
    } else {
      // Versión por defecto basada en timestamp del servidor
      res.json({
        version: Date.now().toString(),
        deployDate: new Date().toISOString(),
        commit: 'unknown',
        branch: 'unknown',
        server: 'running'
      });
    }
  } catch (error) {
    console.error('Error obteniendo versión:', error);
    res.status(500).json({
      error: 'Error obteniendo versión',
      version: 'unknown'
    });
  }
});
