const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const pconf = require('./package.json')
const path = require('path');
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
    entry: {
        shared: ['paper', 'matrix-js-sdk', 'matrix-widget-api'],
        main: {
            import: './src/main.ts',
            dependOn: 'shared',
        },
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
                { from: "./landingPage/about.md" },
                { from: "./landingPage/_config.yaml" },
            ],
        }),
    ],
    module: {
        rules: [
            {
                test: /\.m?js$/,
                exclude: /(node_modules|bower_components)/,
                use: {
                    loader: 'babel-loader',
                    // options:
                }
            },
            {
                test: /\.css$/i,
                use: [MiniCssExtractPlugin.loader, 'css-loader'],
            },
            {
                test: /\.(png|svg|jpg|jpeg|gif)$/i,
                type: 'asset/resource',
            },
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: ['*', '.tsx', '.ts', '.js'],
    },
};