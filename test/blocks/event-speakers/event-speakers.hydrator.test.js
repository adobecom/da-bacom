import { expect } from '@esm-bundle/chai';
import createEventSpeakersHydrator, { selectSpeakers } from '../../../blocks/event-speakers/event-speakers.hydrator.js';

const SPEAKERS = [
  { speakerId: 'spk-2', ordinal: 1, speakerType: 'Speaker', firstName: 'Katie', lastName: 'Johnson' },
  { speakerId: 'spk-1', ordinal: 0, speakerType: 'Speaker', firstName: 'Elise', lastName: 'Swopes' },
  { speakerId: 'jdg-1', ordinal: 0, speakerType: 'Judge', firstName: 'Sam', lastName: 'Rivera' },
];

const blockWith = (variants = '') => {
  document.body.innerHTML = `<div class="event-speakers hydrate${variants ? ` ${variants}` : ''}"></div>`;
  return document.querySelector('.event-speakers');
};

const names = (speakers) => speakers.map((s) => `${s.firstName} ${s.lastName}`);

describe('Event Speakers hydrator', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('selectSpeakers', () => {
    it('filters by the block type variant', () => {
      expect(names(selectSpeakers(SPEAKERS, blockWith('judge')))).to.deep.equal(['Sam Rivera']);
    });

    it('returns every speaker when no type variant is present', () => {
      expect(selectSpeakers(SPEAKERS, blockWith())).to.have.lengthOf(3);
    });

    it('sorts by ordinal', () => {
      expect(names(selectSpeakers(SPEAKERS, blockWith('speaker'))))
        .to.deep.equal(['Elise Swopes', 'Katie Johnson']);
    });

    it('places speakers without an ordinal last', () => {
      const data = [
        { speakerType: 'Speaker', firstName: 'No', lastName: 'Ordinal' },
        { ordinal: 5, speakerType: 'Speaker', firstName: 'Five', lastName: 'X' },
      ];

      expect(names(selectSpeakers(data, blockWith('speaker'))))
        .to.deep.equal(['Five X', 'No Ordinal']);
    });

    it('tolerates type as an alias for speakerType', () => {
      const data = [{ ordinal: 0, type: 'Host', firstName: 'Alex', lastName: 'Chen' }];

      expect(names(selectSpeakers(data, blockWith('host')))).to.deep.equal(['Alex Chen']);
    });

    it('matches type case-insensitively', () => {
      const data = [{ ordinal: 0, speakerType: 'KEYNOTE', firstName: 'Loud', lastName: 'Case' }];

      expect(selectSpeakers(data, blockWith('keynote'))).to.have.lengthOf(1);
    });

    it('returns nothing when no speaker matches the variant', () => {
      expect(selectSpeakers(SPEAKERS, blockWith('keynote'))).to.have.lengthOf(0);
    });

    it('uses the first matching keyword when a block carries two type variants', () => {
      const data = [
        { ordinal: 0, speakerType: 'Speaker', firstName: 'A', lastName: 'Speaker' },
        { ordinal: 0, speakerType: 'Keynote', firstName: 'B', lastName: 'Keynote' },
      ];

      // Documented precedence: TYPE_KEYWORDS order wins, not authoring order
      expect(names(selectSpeakers(data, blockWith('keynote speaker')))).to.deep.equal(['A Speaker']);
    });

    it('falls through to type when speakerType is an empty string', () => {
      const data = [{ ordinal: 0, speakerType: '', type: 'Host', firstName: 'Alex', lastName: 'Chen' }];

      expect(names(selectSpeakers(data, blockWith('host')))).to.deep.equal(['Alex Chen']);
    });

    it('treats an explicitly null ordinal as unordered', () => {
      const data = [
        { ordinal: null, speakerType: 'Speaker', firstName: 'Null', lastName: 'Ordinal' },
        { ordinal: 3, speakerType: 'Speaker', firstName: 'Three', lastName: 'X' },
      ];

      expect(names(selectSpeakers(data, blockWith('speaker'))))
        .to.deep.equal(['Three X', 'Null Ordinal']);
    });

    it('skips speakers with no type when the block filters by one', () => {
      const data = [{ ordinal: 0, firstName: 'Untyped', lastName: 'Person' }];

      expect(selectSpeakers(data, blockWith('speaker'))).to.have.lengthOf(0);
    });

    it('does not mutate or reorder the source array', () => {
      const data = [...SPEAKERS];
      selectSpeakers(data, blockWith('speaker'));

      expect(data).to.deep.equal(SPEAKERS);
    });

    it('returns the original item objects so their indexes stay recoverable', () => {
      const selected = selectSpeakers(SPEAKERS, blockWith('speaker'));

      // event-libs' repeatTemplate uses indexOf to build [[speakers:i.field]]
      expect(SPEAKERS.indexOf(selected[0])).to.equal(1);
      expect(SPEAKERS.indexOf(selected[1])).to.equal(0);
    });
  });

  describe('createEventSpeakersHydrator', () => {
    it('delegates to repeatTemplate with the selection rule', () => {
      const calls = [];
      const hydrate = createEventSpeakersHydrator((block, options) => {
        calls.push({ block, options });
      });
      const block = blockWith('speaker');

      hydrate(block);

      expect(calls).to.have.lengthOf(1);
      expect(calls[0].block).to.equal(block);
      expect(calls[0].options.selectItems).to.equal(selectSpeakers);
    });

    it('produces a synchronous hydrator, as registerHydrator requires', () => {
      const hydrate = createEventSpeakersHydrator(() => {});

      // An async hydrator is rejected by registerHydrator, since Milo does not await
      // decorateArea — see event-libs' hydrate.js
      expect(hydrate.constructor.name).to.equal('Function');
    });

    it('passes through repeatTemplate\'s result so a bail-out is not marked hydrated', () => {
      expect(createEventSpeakersHydrator(() => false)(blockWith('speaker'))).to.be.false;
      expect(createEventSpeakersHydrator(() => true)(blockWith('speaker'))).to.be.true;
    });

    it('drives a stand-in repeatTemplate through the real selection rule', () => {
      // Mirrors event-libs' contract: selectItems(items, block) -> items to render
      const fakeRepeatTemplate = (block, { selectItems }) => {
        const items = JSON.parse(block.dataset.items);
        block.dataset.rendered = selectItems(items, block).map((i) => i.firstName).join(',');
        return true;
      };
      const block = blockWith('judge');
      block.dataset.items = JSON.stringify(SPEAKERS);

      createEventSpeakersHydrator(fakeRepeatTemplate)(block);

      expect(block.dataset.rendered).to.equal('Sam');
    });
  });
});
