import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const type = process.argv[2];
if (!type) {
  console.error('Usage: node utility/split-json.js <type>');
  process.exit(1);
}

const inputFile = `./utility/packs/${type}.json`;
const outputDir = `./packs/${type}`;

// Versionen direkt aus system.json lesen
const systemManifest = JSON.parse(fs.readFileSync('./system.json', 'utf-8'));
const SYSTEM_VERSION = systemManifest.version;
const CORE_VERSION =
  systemManifest.compatibility?.verified ??
  systemManifest.compatibility?.minimum ??
  '14.0.0';

if (!fs.existsSync(inputFile)) {
  console.error(`Input file "${inputFile}" not found.`);
  process.exit(1);
}

// Recreate output folder to avoid stale entries from previous builds
fs.rmSync(outputDir, { recursive: true, force: true });
fs.mkdirSync(outputDir, { recursive: true });

const entries = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));
const singularType = type.endsWith('s') ? type.slice(0, -1) : type;

entries.forEach((entry, index) => {
  // Support both flat format and { data: { name, type, system } } format
  const item = entry.data ?? entry;
  const system = item.system ?? {};

  const id = item._id || crypto.randomBytes(8).toString('base64url');
  const name = item.name || `${singularType.toUpperCase()} ${index}`;
  const itemType = item.type || singularType;

  const record = {
    name,
    type: itemType,
    img: item.img || 'icons/svg/item-bag.svg',
    _id: id,
    _key: `!items!${id}`,
    flags: entry.flags ?? {},
    effects: item.effects ?? [],
    system,
    ownership: item.ownership ?? { default: 0 },
    folder: item.folder ?? null,
    sort: item.sort ?? 0,
    _stats: {
      systemId: 'shadowrun4e',
      systemVersion: SYSTEM_VERSION,
      coreVersion: CORE_VERSION,
      createdTime: null,
      modifiedTime: null,
      lastModifiedBy: 'import-script',
    },
  };

  const filename = name.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.json';
  fs.writeFileSync(
    path.join(outputDir, filename),
    JSON.stringify(record, null, 2),
    'utf-8'
  );
  console.log(`  ${name} → ${filename}`);
});

console.log(`\n ${entries.length} files written to ${outputDir}`);
console.log(
  `   systemVersion: ${SYSTEM_VERSION} | coreVersion: ${CORE_VERSION}`
);
