async function fetchDaSource(path, opts) {
  const daLivePath = `https://admin.da.live/source${path}`;
  const resp = await fetch(daLivePath, opts);
  if (!resp.ok) return '';
  const text = await resp.text();
  return text;
}

export default fetchDaSource;
