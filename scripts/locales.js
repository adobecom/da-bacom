// Locale prefix keys used by tools (e.g. paths-config.js) that need to derive
// per-locale paths without importing scripts.js (which has DOM side effects).
const LOCALE_PREFIXES = [
  '', 'ae_ar', 'ae_en', 'africa', 'ar', 'at', 'au', 'be_en', 'be_fr', 'be_nl',
  'bg', 'br', 'ca_fr', 'ca', 'ch_de', 'ch_fr', 'ch_it', 'cl', 'cn', 'co', 'cr',
  'cy_en', 'cz', 'de', 'dk', 'ec', 'ee', 'eg_ar', 'eg_en', 'el', 'es', 'fi',
  'fr', 'gr_el', 'gr_en', 'gt', 'hk_en', 'hk_zh', 'hu', 'id_en', 'id_id', 'ie',
  'il_en', 'il_he', 'in_hi', 'in', 'it', 'jp', 'kr', 'kw_ar', 'kw_en', 'la',
  'langstore', 'lt', 'lu_de', 'lu_en', 'lu_fr', 'lv', 'mena_ar', 'mena_en', 'mt',
  'mx', 'my_en', 'my_ms', 'ng', 'nl', 'no', 'nz', 'pe', 'ph_en', 'ph_fil', 'pl',
  'pr', 'pt', 'qa_ar', 'qa_en', 'ro', 'ru', 'sa_ar', 'sa_en', 'se', 'sg', 'si',
  'sk', 'th_en', 'th_th', 'tr', 'tw', 'ua', 'uk', 'vn_en', 'vn_vi', 'za',
];

export default LOCALE_PREFIXES;
