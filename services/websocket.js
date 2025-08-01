const WebSocket = require('ws');

let wss;

function initWebSocket(server) {
  wss = new WebSocket.Server({ server });
  wss.on('connection', (ws, req) => {
    const ip = req && req.socket ? req.socket.remoteAddress : 'desconocida';
    console.log(`[WebSocket] Nueva conexión desde ${ip}`);
    ws.send(JSON.stringify({ type: 'connection', message: 'WebSocket conectado' }));
    ws.on('error', (err) => {
      console.error('[WebSocket] Error en conexión:', err);
    });
    ws.on('close', (code, reason) => {
      console.log(`[WebSocket] Conexión cerrada (${code}): ${reason}`);
    });
  });
  wss.on('error', (err) => {
    console.error('[WebSocket] Error en el servidor:', err);
  });
}

function broadcast(data) {
  if (!wss) {
    console.warn('[WebSocket] No hay instancia de WebSocket Server para emitir:', data);
    return;
  }
  let count = 0;
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(JSON.stringify(data));
        count++;
      } catch (err) {
        console.error('[WebSocket] Error enviando mensaje a un cliente:', err);
      }
    }
  });
  console.log(`[WebSocket] Mensaje emitido a ${count} clientes:`, data);
}

module.exports = { initWebSocket, broadcast };
