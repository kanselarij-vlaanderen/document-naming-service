export default {
  GRAPHS: {
    KANSELARIJ: "http://mu.semte.ch/graphs/organizations/kanselarij",
    PUBLIC: "http://mu.semte.ch/graphs/public",
  },
  AGENDA_ITEM_TYPES: {
    NOTA: "http://themis.vlaanderen.be/id/concept/agendapunt-type/dd47a8f8-3ad2-4d5a-8318-66fc02fe80fd",
    MEDEDELING:
      "http://themis.vlaanderen.be/id/concept/agendapunt-type/8f8adcf0-58ef-4edc-9e36-0c9095fd76b0",
  },
  SUBCASE_TYPES: {
    BEKRACHTIGING:
      "http://themis.vlaanderen.be/id/concept/procedurestap-type/bdba2bbc-7af6-490b-98a8-433955cfe869",
  },
  MEETING_TYPES: {
    PVV: "http://themis.vlaanderen.be/id/concept/vergaderactiviteit-type/9b4701f8-a136-4009-94c6-d64fdc96b9a2",
  },
  DECISION_RESULT_CODES: {
    UITGESTELD:
      "http://themis.vlaanderen.be/id/concept/beslissing-resultaatcodes/a29b3ffd-0839-45cb-b8f4-e1760f7aacaa",
  },
  AGENDA_STATUSES: {
    APPROVED:
      "http://themis.vlaanderen.be/id/concept/agenda-status/fff6627e-4c96-4be1-b483-8fefcc6523ca",
  },
  FORMALLY_OK_STATUSES: {
    FORMALLY_OK: "http://kanselarij.vo.data.gift/id/concept/goedkeurings-statussen/CC12A7DB-A73A-4589-9D53-F3C2F4A40636",
  },
  LATIN_ADVERBIAL_NUMERALS: [
    "",
    "bis",
    "ter",
    "quater",
    "quinquies",
    "sexies",
    "septies",
    "octies",
    "novies",
    "decies",
    "undecies",
    "duodecies",
    "ter decies",
    "quater decies",
    "qiundecies",
  ],
  JOB: {
    STATUSES: {
      BUSY: "http://redpencil.data.gift/id/concept/JobStatus/busy",
      SUCCESS: "http://redpencil.data.gift/id/concept/JobStatus/success",
      FAILED: "http://redpencil.data.gift/id/concept/JobStatus/failed",
    },
    RDF_TYPE: "http://mu.semte.ch/vocabularies/ext/DocumentNamingJob",
    RDF_RESOURCE_BASE: "http://mu.semte.ch/services/document-naming",
    JSONAPI_JOB_TYPE: "document-naming-jobs"
  },
  ACCESS_LEVELS: {
    INTERN_SECRETARIE: 'http://themis.vlaanderen.be/id/concept/toegangsniveau/66804c35-4652-4ff4-b927-16982a3b6de8',
  },
} as const;
