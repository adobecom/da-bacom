function parseMetadata(htmlText) {
  const newParser = new DOMParser();
  const parsedPage = newParser.parseFromString(htmlText, 'text/html');
  const metadata = parsedPage.querySelectorAll('.metadata > div');
  metadata.forEach((pair) => {
    const key = pair?.children[0]?.children[0];
    const value = pair?.children[1]?.children[0];
    console.log(`Key ${key?.innerText} Value ${value?.innerText}`);
    if (key.innerText === ppn) {
      page.foundProperty = value.innerText;
    }
  });
  return page;
}

function matchPageToMetadata(html, metdataValue) {
  const newParser = new DOMParser();
  const parsedPage = newParser.parseFromString(html, 'text/html');
  const metadata = parsedPage.querySelectorAll('.metadata > div');
  let foundValue = '';

  metadata.forEach((pair) => {
    const key = pair?.children[0]?.children[0].innerHTML.toLowerCase();
    const value = pair?.children[1]?.children[0].innerHTML;

    if (key === metdataValue.toLowerCase()) foundValue = value;
  });
  return foundValue;
}

export { parseMetadata, matchPageToMetadata }
