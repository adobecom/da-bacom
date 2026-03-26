const BUSINESS_STAGE_ORIGIN = 'https://business.stage.adobe.com';

const STAGED_LOCALES = [
  { code: 'US', path: '', tag: '@us' },
  { code: 'UK', path: '/uk', tag: '@uk' },
  { code: 'AU', path: '/au', tag: '@au' },
  { code: 'JP', path: '/jp', tag: '@jp' },
  { code: 'PT', path: '/pt', tag: '@pt' },
  { code: 'KR', path: '/kr', tag: '@kr' },
  { code: 'IT', path: '/it', tag: '@it' },
  { code: 'ES', path: '/es', tag: '@es' },
  { code: 'FR', path: '/fr', tag: '@fr' },
  { code: 'DE', path: '/de', tag: '@de' },
  { code: 'IN', path: '/in', tag: '@in' },
];

const STAGED_FORMS = [
  {
    key: 'Short',
    formType: 'short',
    urlPath: '/resources/form-test-1-essential-dx-stage.html',
    description: 'Unknown visitor sees the full Essential/Short field set on the staged test page.',
    tags: '@bacom @progressive-profiling @pp @staged @short @smoke @regression',
    unknownVisitor: {
      visible: ['email', 'firstName', 'lastName', 'company', 'country'],
      hidden: ['state', 'postalCode', 'phone', 'jobTitle', 'functionalArea', 'primaryProductInterest'],
    },
    revisitPrefill: ['email', 'firstName', 'lastName', 'company', 'country'],
  },
  {
    key: 'Medium',
    formType: 'medium',
    urlPath: '/resources/form-test-2-expanded-dx-stage.html',
    description: 'Unknown visitor sees the full Expanded/Medium field set on the staged test page.',
    tags: '@bacom @progressive-profiling @pp @staged @medium @smoke @regression',
    unknownVisitor: {
      visible: ['email', 'firstName', 'lastName', 'company', 'country', 'jobTitle', 'functionalArea'],
      hidden: ['state', 'postalCode', 'phone', 'primaryProductInterest'],
    },
    revisitPrefill: ['email', 'firstName', 'lastName', 'company', 'country', 'jobTitle', 'functionalArea'],
  },
  {
    key: 'Full',
    formType: 'rfi',
    urlPath: '/resources/form-test-5-stage.html',
    description: 'Unknown visitor sees the full Contact/Full field set on the staged test page.',
    tags: '@bacom @progressive-profiling @pp @staged @full @smoke @regression',
    unknownVisitor: {
      visible: ['email', 'firstName', 'lastName', 'company', 'country', 'phone', 'jobTitle', 'functionalArea', 'primaryProductInterest'],
      hidden: [],
      visibleAfterCountry: ['state', 'postalCode'],
    },
    revisitPrefill: ['email', 'firstName', 'lastName', 'company', 'country', 'phone', 'jobTitle', 'functionalArea', 'primaryProductInterest', 'state', 'postalCode'],
  },
];

function buildStageUrl(localePath, pagePath) {
  return `${BUSINESS_STAGE_ORIGIN}${localePath}${pagePath}`;
}

const stagedPages = STAGED_LOCALES.flatMap((locale, localeIndex) => STAGED_FORMS.map((form, formIndex) => ({
  tcid: `PP-STAGE-${String((localeIndex * STAGED_FORMS.length) + formIndex + 1).padStart(2, '0')}`,
  name: `@PP-Staged-${locale.code}-${form.key}`,
  url: buildStageUrl(locale.path, form.urlPath),
  formType: form.formType,
  description: `${locale.code} staged test page. ${form.description}`,
  tags: `${form.tags} ${locale.tag}`,
  unknownVisitor: form.unknownVisitor,
  revisitPrefill: form.revisitPrefill,
})));

module.exports = {
  name: 'BACOM Progressive Profiling',
  stagedPages,
  journeyFlows: [
    {
      tcid: 'PP-JOURNEY-01',
      name: '@PP-Essential-To-Expanded',
      sourceFormType: 'short',
      destinationFormType: 'medium',
      sourceUrl: buildStageUrl('', '/resources/form-test-1-essential-dx-stage.html'),
      destinationUrl: buildStageUrl('', '/resources/form-test-2-expanded-dx-stage.html'),
      description: 'Submit Essential/Short, validate PP behavior on Expanded/Medium via email link.',
      tags: '@bacom @progressive-profiling @pp @journey @short-to-medium @manual @nopr @regression',
      expectedHidden: ['firstName', 'lastName', 'company'],
      expectedVisible: ['email', 'country', 'jobTitle', 'functionalArea'],
    },
    {
      tcid: 'PP-JOURNEY-02',
      name: '@PP-Essential-To-Full',
      sourceFormType: 'short',
      destinationFormType: 'rfi',
      sourceUrl: buildStageUrl('', '/resources/form-test-1-essential-dx-stage.html'),
      destinationUrl: buildStageUrl('', '/resources/form-test-5-stage.html'),
      description: 'Submit Essential/Short, validate PP behavior on Full/RFI via email link.',
      tags: '@bacom @progressive-profiling @pp @journey @short-to-rfi @manual @nopr @regression',
      expectedHidden: ['firstName', 'lastName', 'company'],
      expectedVisible: ['email', 'country', 'phone', 'state', 'postalCode', 'jobTitle', 'functionalArea', 'primaryProductInterest'],
    },
    {
      tcid: 'PP-JOURNEY-03',
      name: '@PP-Expanded-To-Full',
      sourceFormType: 'medium',
      destinationFormType: 'rfi',
      sourceUrl: buildStageUrl('', '/resources/form-test-2-expanded-dx-stage.html'),
      destinationUrl: buildStageUrl('', '/resources/form-test-5-stage.html'),
      description: 'Submit Expanded/Medium, validate PP behavior on Full/RFI via email link.',
      tags: '@bacom @progressive-profiling @pp @journey @medium-to-rfi @manual @nopr @regression',
      expectedHidden: ['firstName', 'lastName', 'company', 'jobTitle', 'functionalArea'],
      expectedVisible: ['email', 'country', 'phone', 'state', 'postalCode', 'primaryProductInterest'],
    },
  ],
  ongoingPages: [
    {
      tcid: 'PP-ONGOING-00',
      name: '@PP-Ongoing-US-RequestConsultation',
      url: `${BUSINESS_STAGE_ORIGIN}/request-consultation.html`,
      tags: '@bacom @progressive-profiling @pp @ongoing @regression',
    },
    {
      tcid: 'PP-ONGOING-01',
      name: '@PP-Ongoing-AU-RequestConsultation',
      url: `${BUSINESS_STAGE_ORIGIN}/au/request-consultation.html`,
      tags: '@bacom @progressive-profiling @pp @ongoing @regression',
    },
    {
      tcid: 'PP-ONGOING-02',
      name: '@PP-Ongoing-UK-RequestConsultation',
      url: `${BUSINESS_STAGE_ORIGIN}/uk/request-consultation.html`,
      tags: '@bacom @progressive-profiling @pp @ongoing @regression',
    },
    {
      tcid: 'PP-ONGOING-03',
      name: '@PP-Ongoing-UK-BuildingStrongITFoundations',
      url: `${BUSINESS_STAGE_ORIGIN}/uk/resources/webinars/building-strong-it-foundations.html`,
      tags: '@bacom @progressive-profiling @pp @ongoing @regression',
    },
    {
      tcid: 'PP-ONGOING-04',
      name: '@PP-Ongoing-AU-AI',
      url: `${BUSINESS_STAGE_ORIGIN}/au/ai.html`,
      tags: '@bacom @progressive-profiling @pp @ongoing @regression',
    },
  ],
  outOfScopePages: [
    {
      tcid: 'PP-OOS-01',
      name: '@PP-OOS-Express-RequestInfo',
      url: 'https://www.stage.adobe.com/express/business/request-info',
      tags: '@bacom @progressive-profiling @pp @out-of-scope @regression',
    },
    {
      tcid: 'PP-OOS-02',
      name: '@PP-OOS-Acrobat-Contact',
      url: 'https://www.adobe.com/acrobat/contact.html',
      tags: '@bacom @progressive-profiling @pp @out-of-scope @regression',
    },
    {
      tcid: 'PP-OOS-03',
      name: '@PP-OOS-Acrobat-DeveloperForm',
      url: 'https://www.adobe.com/acrobat/business/developer-form.html',
      tags: '@bacom @progressive-profiling @pp @out-of-scope @regression',
    },
    {
      tcid: 'PP-OOS-04',
      name: '@PP-OOS-AgentOrchestrator',
      url: `${BUSINESS_STAGE_ORIGIN}/products/experience-platform/agent-orchestrator.html`,
      tags: '@bacom @progressive-profiling @pp @out-of-scope @multi-step @regression',
      multiStep: true,
      steps: 3,
    },
    {
      tcid: 'PP-OOS-05',
      name: '@PP-OOS-CreativeCloudBusiness',
      url: `${BUSINESS_STAGE_ORIGIN}/products/creativecloud-business.html`,
      tags: '@bacom @progressive-profiling @pp @out-of-scope @multi-step @regression',
      multiStep: true,
      steps: 3,
    },
  ],
};
