module.exports = {
  apps: [{
    name: 'comedor-app',
    script: './server.js',
    cwd: '/var/www/comedor-app',
    instances: 1,
    env: {
      NODE_ENV: 'production',
      PORT: 3007,
      MONGODB_URI: 'mongodb://127.0.0.1:27017/comedor'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3005
    },
    error_file: '/var/log/pm2/comedor-app-error.log',
    out_file: '/var/log/pm2/comedor-app-out.log',
    log_file: '/var/log/pm2/comedor-app.log',
    time: true,
    watch: false,
    restart_delay: 5000,
    max_restarts: 10,
    min_uptime: '10s',
    max_memory_restart: '500M',
    node_args: '--max-old-space-size=512'
  }]
};
