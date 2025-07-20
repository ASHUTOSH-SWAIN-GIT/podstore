module.exports = {
  apps: [
    {
      name: 'podcast-workers',
      script: 'start-workers.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/workers-error.log',
      out_file: './logs/workers-out.log',
      log_file: './logs/workers-combined.log',
      time: true
    }
  ]
}; 