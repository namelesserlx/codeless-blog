const baseAppConfig = {
    cwd: __dirname,
    node_args: '--experimental-specifier-resolution=node',
};

function createAppConfig(name, script, nodeEnv, extraConfig = {}) {
    return {
        ...baseAppConfig,
        name,
        script,
        env: {
            NODE_ENV: nodeEnv,
            APP_ENV: nodeEnv === 'development' ? 'development' : 'production',
        },
        ...extraConfig,
    };
}

module.exports = {
    apps: [
        createAppConfig('blog-admin-server-dev', './dist/app.js', 'development'),
        createAppConfig('blog-admin-server-prod', './dist/app.js', 'production', {
            instances: 2,
            exec_mode: 'cluster',
            max_memory_restart: '500M',
        }),
        createAppConfig(
            'blog-admin-metrics-worker-dev',
            './dist/scripts/flush-metrics.js',
            'development',
        ),
        createAppConfig(
            'blog-admin-metrics-worker-prod',
            './dist/scripts/flush-metrics.js',
            'production',
        ),
    ],
};
