const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');
const path = require('path');
let distName = 'distDev'
module.exports = merge(common,{
  mode: 'development',
  devtool: 'inline-source-map',
  devServer: {
    watchContentBase: true
  },
  output: {
    path: path.resolve(__dirname, distName),
},
})