import commonjs from './node_modules.backup/@rollup/plugin-commonjs';

export default {
  input: 'index.js',
  output: {
    file: 'dist/index.js',
    format: 'cjs',
  },
  plugins: [
    commonjs(),
  ]
};