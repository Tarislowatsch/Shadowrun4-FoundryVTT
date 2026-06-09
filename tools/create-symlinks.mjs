import * as fs from 'fs';
import path from 'path';
import { config } from 'dotenv';

config();

const installPath = process.env.FOUNDRY_INSTALL_PATH;
if (!installPath) {
  console.log(
    'FOUNDRY_INSTALL_PATH nicht in .env gesetzt – Symlinks werden übersprungen.'
  );
  process.exit(0);
}

console.log('Reforging Symlinks...');

const nested = fs.existsSync(path.join(installPath, 'resources', 'app'));
const fileRoot = nested
  ? path.join(installPath, 'resources', 'app')
  : installPath;

try {
  await fs.promises.mkdir('foundry');
} catch (e) {
  if (e.code !== 'EEXIST') throw e;
}

for (const p of ['client', 'common', 'tsconfig.json']) {
  try {
    await fs.promises.symlink(path.join(fileRoot, p), path.join('foundry', p));
    console.log(`foundry/${p} → ${path.join(fileRoot, p)}`);
  } catch (e) {
    if (e.code === 'EEXIST') {
      console.log(`foundry/${p} already exists.`);
    } else {
      throw e;
    }
  }
}

try {
  await fs.promises.symlink(
    path.join(fileRoot, 'public', 'lang'),
    path.join('foundry', 'lang')
  );
  console.log(`foundry/lang → ${path.join(fileRoot, 'public', 'lang')}`);
} catch (e) {
  if (e.code === 'EEXIST') {
    console.log(`⏭ foundry/lang already exists.`);
  } else {
    throw e;
  }
}

console.log('\n Symlinks done.');
