import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import metablock from 'rollup-plugin-userscript-metablock';

export default {
  input: 'src/index.ts',
  output: {
    file: 'dist/linkmark.user.js',
    format: 'iife',
    sourcemap: false
  },
  plugins: [
    typescript(),
    nodeResolve(),
    metablock({
      file: 'meta.json'
    })
  ]
};