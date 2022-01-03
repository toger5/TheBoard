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
    disableHostCheck: true,
    watchContentBase: true,
    writeToDisk: true
  },
  output: {
    path: path.resolve(__dirname, distName),
  },
})