const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');
const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const browser = process.env.BROWSER || 'chrome';
const manifestFile = browser === 'firefox' ? 'firefox.json' : 'chrome.json';

module.exports = merge(common, {
  mode: 'production',
  devtool: false,
  output: {
    path: path.resolve(__dirname, `../dist/${browser}`),
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, `../manifests/${manifestFile}`),
          to: 'manifest.json',
          transform(content) {
            const base = require('../manifests/base.json');
            const specific = JSON.parse(content.toString());
            return JSON.stringify({ ...base, ...specific }, null, 2);
          },
        },
      ],
    }),
  ],
  optimization: {
    minimize: true,
  },
});
