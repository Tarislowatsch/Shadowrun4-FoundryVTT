/**
 * Hooks into Foundry VTT's `createActor` event to automatically populate
 * newly created character and NPC actors with skills from the system compendium.
 * Characters receive all skills; NPCs receive a curated subset of combat-
 * and perception-relevant skills suitable for typical NPC archetypes.
 * Instantiated once at module load time.
 */
export class SR4CharacterCreationHook {
  constructor() {
    Hooks.on('createActor', async (actor) => {
      if (actor.type === 'character') {
        await new Promise((resolve) => setTimeout(resolve, 0));
        await actor.update({
          'prototypeToken.actorLink': true,
        });
        await this.addSkillsToActor(actor, false);
      } else if (actor.type === 'npc') {
        await this.addSkillsToActor(actor, true);
      }
    });
  }

  /**
   * The compendium pack key containing the SR4 skill item entries.
   * @type {string}
   */
  SKILL_COMPENDIUM = 'shadowrun4e.skills';

  /**
   * Skill names (exact match, case-insensitive) that are added to NPCs.
   * Covers the most common combat, stealth, and awareness use cases.
   * @type {Set<string>}
   */
  NPC_SKILL_ALLOWLIST = new Set([
    'pistols',
    'automatics',
    'rifles',
    'shotguns',
    'heavy weapons',
    'blades',
    'clubs',
    'unarmed combat',
    'archery',
    'throwing weapons',
    'gunnery',
    'perception',
    'infiltration',
    'intimidation',
    'running',
    'gymnastics',
    'swimming',
    'spellcasting',
    'summoning',
    'counterspelling',
  ]);

  /**
   * Fetches Skill entries from the skill compendium and adds them as
   * embedded Item documents on the given actor.
   * For NPCs, only skills present in NPC_SKILL_ALLOWLIST are added.
   *
   * @async
   * @param {SR4BaseCharacterSystem} actor - The newly created actor document.
   * @param {boolean} npcOnly - If true, filter to NPC-relevant skills only.
   * @returns {Promise<void>}
   */
  async addSkillsToActor(actor, npcOnly) {
    if (actor.items.some((i) => i.type === 'Skill')) return;
    const compendium = game?.packs?.get(this.SKILL_COMPENDIUM);
    if (!compendium) {
      ui.notifications?.error(
        `SR4 | Skill compendium "${this.SKILL_COMPENDIUM}" not found.`
      );
      return;
    }

    const index = await compendium.getIndex();
    let skillEntries = index.filter((e) => e?.type === 'Skill');

    if (npcOnly) {
      skillEntries = skillEntries.filter((e) =>
        this.NPC_SKILL_ALLOWLIST.has(e.name?.toLowerCase())
      );
    }

    const skills = await Promise.all(
      skillEntries.map((e) => compendium.getDocument(e._id))
    );

    const skillData = skills
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

    await actor.createEmbeddedDocuments('Item', skillData);
  }
}
