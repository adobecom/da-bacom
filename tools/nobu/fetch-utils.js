async function getDaSourceText(path, token) {
  const HEADERS = {
    'Content-Type': 'application/json',
    // eslint-disable-next-line quote-props
    'Authorization': `Bearer ${token}`,
  };

  const opts = {
    method: 'GET',
    headers: HEADERS,
  };

  const daLivePath = `https://admin.da.live/source${path}`;
  const resp = await fetch(daLivePath, opts);
  if (!resp.ok) return '';
  const text = await resp.text();
  return text;
}

async function updateDaPage(htmlText, path, token) {
  const xmlSer = new XMLSerializer();
  const newText = xmlSer.serializeToString(htmlText);

  const blob = new Blob([newText], { type: 'text/html' });
  const body = new FormData();
  body.append('data', blob);

  const postOpts = {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body,
  };

  const postResp = await fetch(`https://admin.da.live/source${path}`, postOpts);
  if (!postResp.ok) {
    console.error('Issue with updating page');
  }
  return postResp.status;
}

export { getDaSourceText, updateDaPage };
