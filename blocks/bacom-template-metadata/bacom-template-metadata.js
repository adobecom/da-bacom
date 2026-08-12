import { LIBS } from '../../scripts/scripts.js';

export default async function init(el) {
  const { createTag } = await import(`${LIBS}/utils/utils.js`);
  const rows = el.querySelectorAll(':scope > div');
  if (!rows.length) return;

  const tbody = createTag('tbody');
  rows.forEach((row) => {
    const cells = row.querySelectorAll(':scope > div');
    if (cells.length < 2) return;
    const tr = createTag('tr');
    tr.append(
      createTag('td', null, cells[0].innerHTML),
      createTag('td', null, cells[1].innerHTML),
    );
    tbody.append(tr);
  });

  const table = createTag('table', { class: 'template-metadata-table' });
  table.append(tbody);

  el.innerHTML = '';
  el.append(table);
}
