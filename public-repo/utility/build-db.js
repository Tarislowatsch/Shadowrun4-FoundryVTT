import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const PACKS = [
  'skills',
  'programs',
  'gear',
  'spells',
  'metatypes',
  'melee_weapons',
  'ranged_weapons',
  'actions',
  'armors',
];

function run(cmd) {
  execSync(cmd, { stdio: 'inherit' });
}

for (const pack of PACKS) {
  const inputFile = path.resolve('utility/packs', `${pack}.json`);
  if (!fs.existsSync(inputFile)) {
    console.warn(`Skipping missing source file: ${inputFile}`);
    continue;
  }
  run(`node utility/split-json.js ${pack}`);
  run(`node utility/pack.js ${pack}`);
}

console.log('\nAll packs built.');
