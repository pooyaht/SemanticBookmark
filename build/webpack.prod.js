import { merge } from 'webpack-merge';
import common from './webpack.common.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import CopyWebpackPlugin from 'copy-webpack-plugin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const browser = process.env.BROWSER || 'chrome';
const manifestFile = browser === 'firefox' ? 'firefox.json' : 'chrome.json';

export default merge(common, {
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
            const base = JSON.parse(
              readFileSync(path.resolve(__dirname, '../manifests/base.json'), 'utf-8')
            );
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
