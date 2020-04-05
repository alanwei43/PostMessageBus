
const { build } = require('./build');
const pkg = require('../package.json');

pkg.libraryConfig.reduce((prev, config) => {
    return prev.then(() => {
        console.log(`[${config.name}] start build`);
        return build(config)().then(() => {
            console.log(`[${config.name}] complete build`);
            return config;
        });
    });
}, Promise.resolve());
