import { defineConfig, loadEnv } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import path from 'path';
import fs from 'fs';

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function foundryDeployPlugin(foundryDir) {
  if (!foundryDir) return null;
  const outDir = path.resolve('shadowrun4e');
  return {
    name: 'foundry-deploy',
    closeBundle() {
      if (!fs.existsSync(outDir)) return;
      copyDir(outDir, path.join(foundryDir, 'shadowrun4e'));
      console.log('[foundry-deploy] deployed to Foundry');
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const foundryDir = env.FOUNDRY_PATH;
  const isWatch = process.argv.includes('--watch');

  return {
    build: {
      outDir: 'shadowrun4e',
      emptyOutDir: true,
      rolldownOptions: {
        external: [/^foundry/],
        input: {
          main: 'src/index.js',
          style: 'src/styles.scss',
        },
        output: {
          entryFileNames: (chunk) =>
            chunk.name === 'main' ? 'shadowrun4e.js' : '[name].js',
          assetFileNames: '[name][extname]',
        },
      },
      sourcemap: true,
    },
    resolve: {
      alias: {
        '@utils': path.resolve('src/utils'),
        '@models': path.resolve('src/models'),
        '@sheets': path.resolve('src/sheets'),
        '@hooks': path.resolve('src/hooks'),
        '@effects': path.resolve('src/effects'),
        '@documents': path.resolve('src/documents'),
        '@flows': path.resolve('src/flows'),
      },
    },
    plugins: [
      viteStaticCopy({
        targets: [
          { src: 'src/templates/*', dest: 'templates' },
          { src: 'src/assets/*', dest: 'assets' },
          { src: 'src/lang/*.json', dest: 'lang' },
          { src: 'system.json', dest: '.' },
          { src: 'template.json', dest: '.' },
          ...(!isWatch ? [{ src: 'packs/', dest: '.' }] : []),
        ],
      }),
      foundryDeployPlugin(foundryDir),
    ],
  };
});
