const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join } = require('path');

module.exports = (config, context) => {
  const isProduction = context.configuration === 'production';
  
  return {
    output: {
      path: join(__dirname, '../../dist/apps/backend'),
    },
    plugins: [
      new NxAppWebpackPlugin({
        target: 'node',
        compiler: 'tsc',
        main: './src/main.ts',
        tsConfig: './tsconfig.app.json',
        assets: ['./src/assets'],
        optimization: isProduction,
        outputHashing: isProduction ? 'all' : 'none',
        generatePackageJson: true,
        sourceMap: !isProduction,
      }),
    ],
    optimization: isProduction ? {
      minimize: true,
      sideEffects: false,
      usedExports: true,
    } : {},
    resolve: {
      extensions: ['.ts', '.js', '.json'],
      alias: {
        '@shared': join(__dirname, '../../libs/shared/src'),
      },
    },
    externals: {
      // Exclude native modules from bundling
      'class-validator': 'commonjs2 class-validator',
      'class-transformer': 'commonjs2 class-transformer',
    },
  };
};
