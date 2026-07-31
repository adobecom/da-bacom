const TYPE_KEYWORDS = ['speaker', 'judge', 'host', 'keynote'];

export function selectSpeakers(speakers, block) {
  const type = TYPE_KEYWORDS.find((keyword) => block.classList.contains(keyword)) ?? null;

  const filtered = type
    ? speakers.filter((speaker) => {
      const speakerType = speaker.speakerType || speaker.type;
      return (speakerType || '').toString().toLowerCase() === type;
    })
    : [...speakers];

  return filtered.sort((a, b) => {
    const aHas = a.ordinal != null;
    const bHas = b.ordinal != null;
    if (aHas && bHas) return a.ordinal - b.ordinal;
    if (aHas) return -1;
    if (bHas) return 1;
    return 0;
  });
}

export default function createEventSpeakersHydrator(repeatTemplate) {
  return function hydrateEventSpeakers(block) {
    return repeatTemplate(block, { selectItems: selectSpeakers });
  };
}
