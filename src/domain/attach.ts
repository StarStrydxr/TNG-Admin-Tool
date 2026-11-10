/**
 * Writing a rolled technique onto a vault character.
 *
 * A `Technique` entity carries more than a character's `innateTechnique` has room for — cost,
 * limitation, tell, and a shikigami household. Rather than drop those on the floor, the ones
 * without a home are appended to the description as a short labelled tail, so nothing from the
 * roll is lost and Dan can delete any line he does not want.
 *
 * Pure. Nothing here touches the stat block: a technique does not change a grade or a class
 * (CLAUDE.md §4 — the app does not calculate stats).
 */

import type { Character, InnateTechnique } from './character';
import type { Technique } from './entities';

function paragraphs(parts: readonly string[]): string {
  return parts.map((part) => part.trim()).filter(Boolean).join('\n\n');
}

/** The extra fields, as `Label: value` lines. Empty when the technique carries none. */
function tail(technique: Technique): string {
  const lines = [
    technique.cost ? `Cost: ${technique.cost}` : '',
    technique.limitation ? `Limitation: ${technique.limitation}` : '',
    technique.tell ? `Tell: ${technique.tell}` : '',
    technique.shikigami.length > 0
      ? `Shikigami: ${technique.shikigami
          .map((s) => [s.name || 'Unnamed', s.form].filter(Boolean).join(' — '))
          .join('; ')}`
      : '',
  ].filter(Boolean);

  return lines.join('\n');
}

export function techniqueToInnate(technique: Technique): InnateTechnique {
  return {
    name: technique.name,
    description: paragraphs([technique.principle, technique.application, tail(technique)]),
    extensions: technique.extensions,
    maximum: technique.maximum,
    domainExpansion: technique.domain,
  };
}

/** True when attaching would overwrite something the character already has. */
export function hasInnateTechnique(character: Character): boolean {
  const { name, description, extensions, maximum, domainExpansion } = character.innateTechnique;
  return Boolean(
    name.trim() || description.trim() || extensions.length > 0 || maximum.trim() || domainExpansion.trim(),
  );
}

/**
 * Replace the character's innate technique. `now` is injected so this stays pure and the caller
 * owns the clock.
 */
export function attachTechnique(
  character: Character,
  technique: Technique,
  now: string,
): Character {
  return {
    ...character,
    innateTechnique: techniqueToInnate(technique),
    updatedAt: now,
  };
}
