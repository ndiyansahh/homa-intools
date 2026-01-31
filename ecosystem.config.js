module.exports = {
    apps: [
        {
            name: 'homa-staging',
            script: 'npm',
            args: 'start -- -p 3001 -H 0.0.0.0',
            cwd: '/var/www/homa-staging',
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '1G',
            env: {
                NODE_ENV: 'production',
                PORT: 3001
            }
        },
        {
            name: 'homa-production',
            script: 'npm',
            args: 'start -- -p 3000 -H 0.0.0.0',
            cwd: '/var/www/homa-production',
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '1G',
            env: {
                NODE_ENV: 'production',
                PORT: 3000
            }
        }
    ]
};
