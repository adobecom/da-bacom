import sinon from 'sinon';

export const crawl = sinon.stub();

export const setCrawlItems = (items) => {
  crawl.resetHistory();
  crawl.callsFake(({ callback }) => {
    const run = (async () => {
      const processed = [];
      for (const item of items) {
        // eslint-disable-next-line no-await-in-loop
        await callback?.(item);
        processed.push(item);
      }
      return processed;
    })();
    return { results: run };
  });
};
