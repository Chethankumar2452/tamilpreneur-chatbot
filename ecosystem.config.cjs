// ecosystem.config.cjs
// PM2 process manager config for non-Docker deployment
module.exports = {
  apps: [
    {
      name: 'gs-backend',
      script: './backend/src/index.js',
      cwd: './backend',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      env_file: './backend/.env',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: './backend/logs/pm2-error.log',
      out_file: './backend/logs/pm2-out.log',
      max_memory_restart: '512M',
      restart_delay: 3000,
      watch: false,
    },
  ],
};
