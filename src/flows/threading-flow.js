import { localize, rollSkillDialog } from '@utils/dialog/dialogutility.js';
import {
  loadAvailableComplexForms,
  openHitsSelectionDialog,
  openThreadingSelectionDialog,
} from '@utils/dialog/magic/threading.js';
import {
  calculateFadingValue,
  calculateThreadingCap,
  clampRating,
} from '@utils/dialog/magic/threading-helpers.js';
import {
  resolveDrain,
  calculateResonanceFadingPool,
} from '@utils/dialog/magic/drain.js';
import { offerEdgeRetry } from '@utils/rolls/roll-edge-decision.js';

export class ThreadingFlow {
  /**
   * @param {import('@documents/index').SR4Actor} actor
   * @returns {Promise<void>}
   */
  static async start(actor) {
    if (!actor.getAttribute('RESONANCE')) {
      ui?.notifications?.error(localize('sr4.magic.resonanceStatZero'));
      return;
    }
    if (!actor.getSkill('Software')) {
      ui?.notifications?.error(localize('sr4.matrix.noSoftwareSkill'));
      return;
    }

    const formsMap = await loadAvailableComplexForms(actor);
    const selection = await openThreadingSelectionDialog(actor, formsMap);
    if (!selection) return;

    const { doc: complexForm, source } = selection;

    const rollResult = await ThreadingFlow._rollThreading(actor, complexForm);
    if (!rollResult) return;

    const hits = await offerEdgeRetry(actor, rollResult);

    let threadedRating = 0;
    let usedHits = 0;
    if (!rollResult.isGlitch && hits > 0) {
      const resonance = actor.getAttribute('RESONANCE') ?? 0;
      const cap = calculateThreadingCap(resonance);
      const currentRating =
        source === 'actor' ? (complexForm.system.rating ?? 0) : 0;
      const maxUsable = Math.min(hits, Math.max(0, cap - currentRating));
      const chosen = await openHitsSelectionDialog(hits, maxUsable, cap);
      if (chosen === null) return;
      usedHits = chosen;

      if (usedHits > 0) {
        threadedRating = await ThreadingFlow._applyRatingChange(
          actor,
          complexForm,
          source,
          usedHits
        );
        await actor.applyEffectTemplate('sustain');
      } else {
        ui?.notifications?.info(localize('sr4.matrix.threadingFailed'));
      }
    } else {
      ui?.notifications?.info(localize('sr4.matrix.threadingFailed'));
    }

    await ThreadingFlow._handleFading(
      actor,
      complexForm,
      threadedRating,
      usedHits
    );
  }

  /**
   * @param {import('@documents/index').SR4Actor} actor
   * @param {import('@documents/index').SR4Item} complexForm
   * @returns {Promise<{successes: number, isGlitch: boolean, rolledDice: number, edgeUsed: boolean, messageId: string | null} | undefined>}
   */
  static async _rollThreading(actor, complexForm) {
    const softwareSkill = actor.getSkill('Software');
    const softwareRating = softwareSkill.system.rating ?? 0;
    const resonance = actor.getAttribute('RESONANCE') ?? 0;
    const numDice = Math.max(resonance + softwareRating, 1);

    return rollSkillDialog(actor, 'Software', numDice, {
      titleSuffix: ` (${localize('sr4.matrix.threading')}: ${complexForm.name})`,
    });
  }

  /**
   * @param {import('@documents/index').SR4Actor} actor
   * @param {import('@documents/index').SR4Item} complexForm
   * @param {'actor' | 'compendium' | 'world'} source
   * @param {number} hits
   * @returns {Promise<number>} the newly threaded rating
   */
  static async _applyRatingChange(actor, complexForm, source, hits) {
    const resonance = actor.getAttribute('RESONANCE') ?? 0;
    const cap = calculateThreadingCap(resonance);
    let newRating;

    if (source === 'actor') {
      newRating = clampRating((complexForm.system.rating ?? 0) + hits, cap);
      await complexForm.update({
        'system.rating': newRating,
        'system.threaded': true,
      });
    } else {
      newRating = clampRating(hits, cap);
      const itemData = complexForm.toObject();
      delete itemData._id;
      itemData.system.rating = newRating;
      itemData.system.threaded = true;
      await actor.createEmbeddedDocuments('Item', [itemData]);
    }

    ui?.notifications?.info(
      localize('sr4.matrix.threadingSucceeded').replace(
        '{rating}',
        String(newRating)
      )
    );
    return newRating;
  }

  /**
   * @param {import('@documents/index').SR4Actor} actor
   * @param {import('@documents/index').SR4Item} complexForm
   * @param {number} threadedRating
   * @param {number} hits
   * @returns {Promise<void>}
   */
  static async _handleFading(actor, complexForm, threadedRating, hits) {
    const resonance = actor.getAttribute('RESONANCE') ?? 0;
    const fadingValue = calculateFadingValue(hits);
    const isPhysical = threadedRating > resonance;
    const fadingAttr = actor.system.technomancy?.fadingAttribute ?? 'WILLPOWER';
    const drainPool = calculateResonanceFadingPool(actor, fadingAttr);

    await resolveDrain(actor, {
      label: complexForm.name,
      force: threadedRating,
      drainPool,
      drainValue: fadingValue,
      isPhysical,
    });
  }
}
