// Selects which speakers the event-speakers block renders, and in what order.
// Content comes from the authored template, never from here. See README.md.
const TYPE_KEYWORDS = ['speaker', 'judge', 'host', 'keynote'];

export function selectSpeakers(speakers, block) {
  const type = TYPE_KEYWORDS.find((keyword) => block.classList.contains(keyword)) ?? null;

  const filtered = type
    ? speakers.filter((speaker) => {
      const speakerType = speaker.speakerType || speaker.type;
      return (speakerType || '').toString().toLowerCase() === type;
    })
    : [...speakers];

  // Speakers without an ordinal sort last
  return filtered.sort((a, b) => {
    const aHas = a.ordinal != null;
    const bHas = b.ordinal != null;
    if (aHas && bHas) return a.ordinal - b.ordinal;
    if (aHas) return -1;
    if (bHas) return 1;
    return 0;
  });
}

// repeatTemplate is injected, not imported: scripts.js owns the event-libs URL.
// The hydrator must stay sync, and returns the result so a bail-out can be retried.
export default function createEventSpeakersHydrator(repeatTemplate) {
  return function hydrateEventSpeakers(block) {
    return repeatTemplate(block, { selectItems: selectSpeakers });
  };
}
