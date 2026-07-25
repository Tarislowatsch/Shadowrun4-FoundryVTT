import { parseNpcDefaultSkills } from '@sheets/settings/npc-default-skills.js';

/**
 * @param {import('./actor.js').SR4Actor} actor
 * @param {boolean} npcOnly
 * @returns {Promise<void>}
 */
export async function addSkillsFromCompendium(actor, npcOnly) {
  if (actor.items.some((i) => i.type === 'Skill')) return;
  const skillData = await buildCompendiumSkillData(npcOnly);
  if (skillData.length > 0)
    await actor.createEmbeddedDocuments('Item', skillData);
}

/**
 * @param {boolean} [npcOnly=false]
 * @returns {Promise<Array<{ name: string, type: string, img: string|null, system: object, effects: [] }>>}
 */
export async function buildCompendiumSkillData(npcOnly = false) {
  const compendium = game?.packs?.get('shadowrun4e.skills');
  if (!compendium) {
    ui.notifications?.error(
      'SR4 | Skill compendium "shadowrun4e.skills" not found.'
    );
    return [];
  }
  const index = await compendium.getIndex();
  let skillEntries = index.filter((e) => e?.type === 'Skill');
  if (npcOnly) {
    const allowlist = new Set(
      parseNpcDefaultSkills(
        game.settings.get('shadowrun4e', 'npcDefaultSkills')
      )
    );
    skillEntries = skillEntries.filter((e) =>
      allowlist.has(e.name?.toLowerCase())
    );
  }
  const skills = await Promise.all(
    skillEntries.map((e) => compendium.getDocument(e._id))
  );
  return skills
    .filter(Boolean)
    .map((s) => {
      const obj = s.toObject();
      return {
        name: obj.name ?? s.name,
        type: obj.type ?? s.type,
        img: obj.img ?? null,
        system: obj.system ?? {},
        effects: [],
      };
    })
    .filter((s) => s.name && s.type);
}
