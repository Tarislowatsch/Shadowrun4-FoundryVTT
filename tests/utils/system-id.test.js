import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { SYSTEM_ID } from '../../src/utils/game/system-id.js';

describe('SYSTEM_ID', () => {
  it('matches the id the manifest declares', () => {
    const manifest = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'system.json'), 'utf8')
    );

    expect(SYSTEM_ID).toBe(manifest.id);
  });
});
