/**
 * Hydrator for the event-speakers block, driven by event-libs' `speakers` metadata.
 *
 * All content is authored: the author writes one template row of [[speakers.*]]
 * placeholders plus any static text (the "Read more" label included), and event-libs
 * clones that row per speaker and resolves the placeholders. This file only decides
 * which speakers appear and in what order.
 *
 * Registered from scripts.js before decorateEvent. The returned hydrator must stay
 * synchronous — registerHydrator rejects async functions, because Milo does not await
 * decorateArea for fragments or personalization.
 */
const TYPE_KEYWORDS = ['speaker', 'judge', 'host', 'keynote'];

export function selectSpeakers(speakers, block) {
  const type = TYPE_KEYWORDS.find((keyword) => block.classList.contains(keyword)) ?? null;

  const filtered = type
    ? speakers.filter((speaker) => {
      const speakerType = speaker.speakerType || speaker.type;
      return (speakerType || '').toString().toLowerCase() === type;
    })
    : [...speakers];

  // Speakers without an ordinal sort last, preserving their authored order.
  return filtered.sort((a, b) => {
    const aHas = a.ordinal != null;
    const bHas = b.ordinal != null;
    if (aHas && bHas) return a.ordinal - b.ordinal;
    if (aHas) return -1;
    if (bHas) return 1;
    return 0;
  });
}

/**
 * Builds the hydrator. `repeatTemplate` is injected rather than imported so this module
 * stays free of a circular dependency on scripts.js, which owns the event-libs URL.
 * @param {Function} repeatTemplate event-libs' repeatTemplate, from its libs.js
 * @returns {(block: HTMLElement) => void} A synchronous hydrator
 */
export default function createEventSpeakersHydrator(repeatTemplate) {
  // Returning the result lets event-libs skip marking the block hydrated when we bailed
  // out, so a later fragment or personalization pass can retry.
  return function hydrateEventSpeakers(block) {
    return repeatTemplate(block, { selectItems: selectSpeakers });
  };
}
