const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const pconf = require('./package.json')
const path = require('path');
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
    entry: {
        main: './src/main.js'
        // helper: './src/helper.js',
        // paper: 'paper',
        // matrix: 'matrix-js-sdk',
        // main: {
        //     import: './src/main.js',
        //     dependOn: ['paper', 'matrix','helper']
        // },
    },
    output: {
        filename: '[name].bundle.js',
        path: path.resolve(__dirname, 'dist'),
        clean: true,
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: './src/index.html',
            // favicon: "./src/resources/favicon.ico",
        }),
        new webpack.DefinePlugin({
            'process.env': {
                PACKAGE_VERSION: '"' + pconf.version + '"'
            }
        }),
        new MiniCssExtractPlugin(),
        new CopyPlugin({
            patterns: [
                { from: "./src/resources/settings-symbolic.svg" },
                { from: "./src/resources/style.css" },
                { from: "./src/resources/favicon.ico" },
            ],
        }),
    ],
    module: {
        rules: [
            {
                test: /\.css$/i,
                use: [MiniCssExtractPlugin.loader, 'css-loader'],
            },
            {
                test: /\.(png|svg|jpg|jpeg|gif)$/i,
                type: 'asset/resource',
            },
        ],
    },
};