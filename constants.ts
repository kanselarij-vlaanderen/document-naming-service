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
  PIECE_TYPES: {
    RATIFICATION: "http://themis.vlaanderen.be/id/concept/document-type/609cf883-b52c-43fe-84b1-eed02527173b",
    DECREET: "https://data.vlaanderen.be/id/concept/AardWetgeving/Decreet",
  },
  DECISION_RESULT_CODES: {
    GOEDGEKEURD:
      "http://themis.vlaanderen.be/id/concept/beslissing-resultaatcodes/56312c4b-9d2a-4735-b0b1-2ff14bb524fd",
    UITGESTELD:
      "http://themis.vlaanderen.be/id/concept/beslissing-resultaatcodes/a29b3ffd-0839-45cb-b8f4-e1760f7aacaa",
    KENNISNAME:
      "http://themis.vlaanderen.be/id/concept/beslissing-resultaatcodes/9f342a88-9485-4a83-87d9-245ed4b504bf",
    INGETROKKEN:
      "http://themis.vlaanderen.be/id/concept/beslissing-resultaatcodes/453a36e8-6fbd-45d3-b800-ec96e59f273b",
  },
  AGENDA_STATUSSES: {
    APPROVED:
      "http://themis.vlaanderen.be/id/concept/agenda-status/fff6627e-4c96-4be1-b483-8fefcc6523ca",
    DESIGN:
      "http://themis.vlaanderen.be/id/concept/agenda-status/b3d8a99b-0a7e-419e-8474-4b508fa7ab91",
  },
  FORMALLY_OK_STATUSSES: {
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
    STATUS: {
      RUNNING: "http://vocab.deri.ie/cogs#Running",
      SUCCESS: "http://vocab.deri.ie/cogs#Success",
      FAIL: "http://vocab.deri.ie/cogs#Fail",
    },
    RDF_TYPE: "http://mu.semte.ch/vocabularies/ext/DocumentNamingJob",
    RDF_RESOURCE_BASE: "http://mu.semte.ch/services/document-naming",
    JSONAPI_JOB_TYPE: "document-naming-jobs"
  },
  ACCESS_LEVELS: {
    INTERN_SECRETARIE: 'http://themis.vlaanderen.be/id/concept/toegangsniveau/66804c35-4652-4ff4-b927-16982a3b6de8',
    VERTROUWELIJK: 'http://themis.vlaanderen.be/id/concept/toegangsniveau/9692ba4f-f59b-422b-9402-fcbd30a46d17',
    INGETROKKEN: 'http://themis.vlaanderen.be/id/concept/toegangsniveau/969a712a-b3d3-406f-ab08-5f665427185a',
    INTERN_REGERING: 'http://themis.vlaanderen.be/id/concept/toegangsniveau/13ae94b0-6188-49df-8ecd-4c4a17511d6d',
    INTERN_OVERHEID: 'http://themis.vlaanderen.be/id/concept/toegangsniveau/634f438e-0d62-4ae4-923a-b63460f6bc46',
    PUBLIEK: 'http://themis.vlaanderen.be/id/concept/toegangsniveau/c3de9c70-391e-4031-a85e-4b03433d6266',
  },
} as const;
