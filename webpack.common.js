const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');
const pconf = require('./package.json')
module.exports = {
    entry: './src/main.js',
    output: {
        filename: 'bundle.js',
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: './src/index.html'
        }),
        new webpack.DefinePlugin({
            'process.env': {
                PACKAGE_VERSION: '"' + pconf.version + '"'
            }
        }),
    ],
    module: {
        rules: [
            {
                test: /\.css$/i,
                use: ['style-loader', 'css-loader'],
            },
            {
                test: /\.(png|svg|jpg|jpeg|gif)$/i,
                type: 'asset/resource',
            },
        ],
    },
};