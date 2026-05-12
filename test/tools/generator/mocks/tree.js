import sinon from 'sinon';

export const crawl = sinon.stub();

export const setCrawlItems = (items) => {
  crawl.resetHistory();
  crawl.callsFake(({ path: crawlPath, callback }) => {
    const run = (async () => {
      const matching = items.filter((item) => item.path?.startsWith(crawlPath));
      const processed = [];
      for (const item of matching) {
        // eslint-disable-next-line no-await-in-loop
        await callback?.(item);
        processed.push(item);
      }
      return processed;
    })();
    return { results: run };
  });
};
