module.exports = function (api) {
    api.cache(false);
    return {
        presets: [['@babel/preset-env', {
            // useBuiltIns: 'usage',
            // corejs: 3,
            useBuiltIns: false,
            modules: false,
            debug: false,
            targets: {
                // browsers: [
                // 'ie >= 8'
                // ]
            }
        }]],
        plugins: []
    };
};
