const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');
const path = require('path');
let distName = 'distDev'
module.exports = merge(common, {
  mode: 'development',
  devtool: 'eval-source-map',
  devServer: {
    host: '0.0.0.0',//your ip address
    port: 8081,
    allowedHosts: 'all',
    static: { watch: true },
    devMiddleware: { writeToDisk: true },
  },
  output: {
    path: path.resolve(__dirname, distName),
  },
})
