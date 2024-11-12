import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import metablock from 'rollup-plugin-userscript-metablock';

const devServer = 'http://localhost:10001';

// 基础构建配置
const baseConfig = {
  input: 'src/index.ts',
  plugins: [
    typescript(),
    nodeResolve()
  ]
};

// 导出配置
export default [
  // 开发壳
  {
    ...baseConfig,
    output: {
      file: 'dist/linkmark.dev.user.js',
      format: 'iife',
      sourcemap: true
    },
    plugins: [
      ...baseConfig.plugins,
      metablock({
        file: 'meta.dev.json',
        override: {
          require: `${devServer}/linkmark.user.js`
        }
      })
    ]
  },
  // 实际代码
  {
    ...baseConfig,
    output: {
      file: 'dist/linkmark.user.js',
      format: 'iife',
      sourcemap: true
    },
    plugins: [
      ...baseConfig.plugins,
      metablock({
        file: 'meta.json'
      })
    ]
  }
];