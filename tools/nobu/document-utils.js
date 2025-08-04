function matchPageToMetadata(html, metdataValue, key = true) {
  const newParser = new DOMParser();
  const parsedPage = newParser.parseFromString(html, 'text/html');
  const metadata = parsedPage.querySelectorAll('.metadata > div');
  let foundValue = '';

  metadata.forEach((pair) => {
    const mdKey = pair?.children[0]?.children[0];
    const mdValue = pair?.children[1]?.children[0];
    const mdToCheck = key ? mdKey : mdValue;

    if (mdToCheck.innerHTML.toLowerCase() === metdataValue.toLowerCase()) foundValue = mdValue;
  });
  return { foundValue, parsedPage };
}

export default matchPageToMetadata;
