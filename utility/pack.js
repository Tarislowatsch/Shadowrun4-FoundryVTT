import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const name = process.argv[2];
if (!name) {
  console.error('Usage: node utility/pack.js <packName>');
  process.exit(1);
}

console.log(`Packing ${name}...`);
execSync(
  `fvtt package pack -n ${name} --type System --inputDirectory packs/${name} --outputDirectory packs`,
  { stdio: 'inherit' }
);

const jsonDir = path.resolve(`packs/${name}`);
const removed = fs.readdirSync(jsonDir).filter((f) => f.endsWith('.json'));
removed.forEach((f) => fs.rmSync(path.join(jsonDir, f)));
console.log(`Removed ${removed.length} JSON files from packs/${name}`);
