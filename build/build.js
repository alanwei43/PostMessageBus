const rollup = require('rollup');
const resolve = require('rollup-plugin-node-resolve');
const commonjs = require('rollup-plugin-commonjs');
const babel = require('rollup-plugin-babel');
const pkg = require('../package.json');
const fs = require('fs');
const terser = require('terser');

/**
 * 返回构建函数
 * @param {string} inputFile 目录名
 * @param {string} outputFile 获取输出文件路径
 * @param {string} globalName 全局变量名
 * @param {string} version 版本号
 * @returns {function} 构建函数
 */
module.exports.build = function ({ inputFile, outputFile, globalName, version, description }) {
    const getOutputFile = format => outputFile.replace('{{format}}', format);

    const banner = `/*!
  * ${globalName} v${version}
  * ${pkg.repository.url}
  * ${description || ''}
  * @author ${pkg.author}
  */`;

    const iifeInput = {
        input: inputFile,
        plugins: [
            resolve(),
            commonjs(),
            babel({
                exclude: ['node_modules/**']
            })
        ]
    };
    const iifeOutput = {
        name: globalName,
        file: getOutputFile('iife'),
        format: 'iife',
        banner: banner
    };

    const umdInput = {
        input: inputFile,
        plugins: [
            resolve(),
            commonjs(),
            babel({
                exclude: ['node_modules/**']
            })
        ]
    };
    const umdOutput = {
        name: globalName,
        file: getOutputFile('umd'),
        format: 'umd',
        banner: banner
    };

    const cjsInput = {
        input: inputFile,
        external: ['es6-promise'],
        plugins: [
            babel({
                exclude: ['node_modules/**']
            })]
    };
    const cjsOutput = {
        file: getOutputFile('cjs'),
        format: 'cjs',
        banner: banner
    };

    const es6Input = {
        input: inputFile,
        external: ['es6-promise'],
        plugins: [
            babel({
                exclude: ['node_modules/**']
            })
        ]
    };
    const es6Output = {
        file: getOutputFile('es6'),
        format: 'es',
        banner: banner
    };

    return async function () {
        const iifeBundle = await rollup.rollup(iifeInput);
        await iifeBundle.write(iifeOutput);

        if (globalName) {
            console.log('bundle umd format');
            const umdBundle = await rollup.rollup(umdInput);
            await umdBundle.write(umdOutput);
            const result = await umdBundle.generate(umdOutput);
            writeMinify(umdOutput.file, result.output[0].code);
        }

        console.log('bundle cjs format');
        const cjsBundle = await rollup.rollup(cjsInput);
        await cjsBundle.write(cjsOutput);

        console.log('bundle es6 format');
        const es6Bundle = await rollup.rollup(es6Input);
        await es6Bundle.write(es6Output);
        return 'ok';
    };
};

/**
 * 写文件
 * @param {string} filePath 文件路径
 * @param {string} code 文件路径
 */
function writeMinify(filePath, code) {
    filePath = filePath.replace(/^(.+)\.js$/, '$1.min.js');
    const minify = terser.minify(code, {
        toplevel: true,
        warnings: true,
        sourceMap: true,
        output: {
            ascii_only: true,
            beautify: false
        },
        compress: {
            keep_fnames: true,
            warnings: true
        }
    });
    fs.writeFileSync(filePath, minify.code, { encoding: 'utf8' });
}
