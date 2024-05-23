import {
  booleanize,
  parseAndReshape,
  parseSparqlResponse,
  prefixHeaderLines,
} from "./sparql-utils";
import {
  sparqlEscapeString,
  sparqlEscapeUri,
  query,
  update,
  sparqlEscapeInt,
} from "mu";
import CONSTANTS from "../constants";
import { Agenda, Agendaitem, Piece } from "../types/types";

async function getSortedAgendaitems(agendaId: string): Promise<Agendaitem[]> {
  const queryString = `
    ${prefixHeaderLines.adms}
    ${prefixHeaderLines.besluitvorming}
    ${prefixHeaderLines.dct}
    ${prefixHeaderLines.ext}
    ${prefixHeaderLines.mu}
    ${prefixHeaderLines.schema}
    ${prefixHeaderLines.prov}

    SELECT DISTINCT ?agendaitem ?subcaseType
      ?agendaitemType ?isPostponed ?agendaActivityNumber ?position WHERE {
      GRAPH ${sparqlEscapeUri(CONSTANTS.GRAPHS.KANSELARIJ)} {
          VALUES ?agendaId { ${sparqlEscapeString(agendaId)} }
          ?agenda
            mu:uuid ?agendaId ;
            dct:hasPart ?agendaitem .
          ?agendaitem
            ^besluitvorming:genereertAgendapunt
            / prov:wasInformedBy
            / ext:indieningVindtPlaatsTijdens ?subcase ;
            ext:formeelOK ${sparqlEscapeUri(CONSTANTS.FORMALLY_OK_STATUSSES.FORMALLY_OK)} ;
            schema:position ?position .
          OPTIONAL { ?subcase dct:type ?subcaseType }
          OPTIONAL { ?subcase adms:identifier ?agendaActivityNumber }
          ?subcase ext:agendapuntType ?agendaitemType .
          OPTIONAL {
            ?postponedAgendaitem
              ^besluitvorming:genereertAgendapunt
              / prov:wasInformedBy
              / ext:indieningVindtPlaatsTijdens ?subcase .
            ?postponedAgendaitem
              ^dct:subject
              / besluitvorming:heeftBeslissing
              / besluitvorming:resultaat ${sparqlEscapeUri(
                CONSTANTS.DECISION_RESULT_CODES.UITGESTELD
              )} .
          }
          BIND(IF(bound(?postponedAgendaitem), "true"^^xsd:boolean, "false"^^xsd:boolean) AS ?isPostponed)
      }
    } ORDER BY ?position
  `;

  const response = await query(queryString);

  // Workaround for Virtuoso bug
  booleanize(response, ["isPostponed"]);

  return parseAndReshape(response, {
    idProp: "agendaitem",
    destIdProp: "uri",
    kind: "resource",
    propShapers: {
      subcaseType: { kind: "literal" },
      type: { kind: "literal", sourceProp: "agendaitemType" },
      isPostponed: { kind: "literal" },
      agendaActivityNumber: { kind: "literal" },
    },
  }) as Agendaitem[];
}

async function getPiecesForAgenda(agendaId: string): Promise<Piece[]> {
  const queryString = `
    ${prefixHeaderLines.besluit}
    ${prefixHeaderLines.besluitvorming}
    ${prefixHeaderLines.dct}
    ${prefixHeaderLines.mu}
    SELECT ?uri ?title
    WHERE {
      ?agenda
        mu:uuid ${sparqlEscapeString(agendaId)} ;
        dct:hasPart ?agendaitem .
      ?agendaitem
        a besluit:Agendapunt ;
        besluitvorming:geagendeerdStuk ?uri .

      ?uri dct:title ?title .
    }
  `;

  const results = await query(queryString);
  const parsed = parseSparqlResponse(results);

  return parsed as Piece[];
}

async function getSubcasePieces(subcase: string) {
  const queryString = `
${prefixHeaderLines.prov}
${prefixHeaderLines.ext}
${prefixHeaderLines.pav}
${prefixHeaderLines.dct}
${prefixHeaderLines.dossier}

SELECT DISTINCT ?piece ?pieceName ?pieceType
FROM ${sparqlEscapeUri(CONSTANTS.GRAPHS.PUBLIC)}
FROM ${sparqlEscapeUri(CONSTANTS.GRAPHS.KANSELARIJ)}
WHERE {
  ?submissionActivity ext:indieningVindtPlaatsTijdens ${sparqlEscapeUri(
    subcase
  )} ;
                      prov:generated ?piece .
  FILTER NOT EXISTS { [] pav:previousVersion ?piece }
  ?piece dct:title ?pieceName .
  OPTIONAL { ?documentContainer dossier:Collectie.bestaatUit ?piece ; dct:type ?pieceType . }
}
ORDER BY ?pieceName`;

  const response = await query(queryString);
  const results = parseSparqlResponse(response);

  return results;
}

async function getLastAgendaActivityNumber(
  year: number,
  type: "nota" | "announcement" | "decree",
  isPvv: boolean
): Promise<number> {
  const queryString = `
    ${prefixHeaderLines.adms}
    ${prefixHeaderLines.besluitvorming}
    ${prefixHeaderLines.dct}
    ${prefixHeaderLines.ext}
    ${prefixHeaderLines.generiek}
    ${prefixHeaderLines.prov}
    ${prefixHeaderLines.xsd}

    SELECT (MAX(?agendaActivityNumber) AS ?maxNumber) WHERE {
      GRAPH ${sparqlEscapeUri(CONSTANTS.GRAPHS.KANSELARIJ)} {
          ?subcase
            ${
              type === "decree"
                ? `dct:type ${sparqlEscapeUri(
                    CONSTANTS.SUBCASE_TYPES.BEKRACHTIGING
                  )}`
                : `ext:agendapuntType ${sparqlEscapeUri(
                    type === "announcement"
                      ? CONSTANTS.AGENDA_ITEM_TYPES.MEDEDELING
                      : CONSTANTS.AGENDA_ITEM_TYPES.NOTA
                  )}`
            } ;
            adms:identifier ?agendaActivityNumber .
          ?agendaitem
            ^besluitvorming:genereertAgendapunt
              / prov:wasInformedBy
              / ext:indieningVindtPlaatsTijdens ?subcase .
          ?agendaStatusActivity
            prov:used ?agenda ;
            generiek:bewerking ${sparqlEscapeUri(
              CONSTANTS.AGENDA_STATUSSES.APPROVED
            )} ;
            prov:startedAtTime ?agendaApprovedDateTime .
          ?agenda
            besluitvorming:isAgendaVoor ?meeting ;
            dct:hasPart ?agendaitem .
          ${
            isPvv
              ? `
                ?meeting
                  dct:type ${sparqlEscapeUri(CONSTANTS.MEETING_TYPES.PVV)} .
            `
              :  `MINUS {
                ?meeting
                  dct:type ${sparqlEscapeUri(CONSTANTS.MEETING_TYPES.PVV)} .
              }`
          }
          FILTER (?agendaApprovedDateTime >= "${year}-01-01T00:00:00.000Z"^^xsd:dateTime)
          FILTER (?agendaApprovedDateTime <= "${year}-12-31T23:59:59.999Z"^^xsd:dateTime)
      }
    }
  `;

  const response = await query(queryString);
  const parsed = parseSparqlResponse(response);
  const maxNumber = parsed[0]?.["maxNumber"];

  if (!maxNumber) {
    return 0;
  }
  if (typeof maxNumber !== "number") throw new Error("Should never happen");

  return maxNumber;
}

async function getAgenda(agendaId: string): Promise<Agenda | null> {
  const queryString = `
    ${prefixHeaderLines.besluit}
    ${prefixHeaderLines.besluitvorming}
    ${prefixHeaderLines.dct}
    ${prefixHeaderLines.mu}
    SELECT ?agenda ?meeting ?plannedStart ?meetingType
    WHERE {
      GRAPH ${sparqlEscapeUri(CONSTANTS.GRAPHS.KANSELARIJ)} {
        ?agenda
          mu:uuid ${sparqlEscapeString(agendaId)} ;
          besluitvorming:isAgendaVoor ?meeting .
        ?meeting
          besluit:geplandeStart ?plannedStart ;
          dct:type ?meetingType .
      }
    } LIMIT 1
  `;

  const response = await query(queryString);
  const parsed = parseSparqlResponse(response);
  const head = parsed[0];

  if (!head) return null;

  return {
    uri: head["agenda"],
    meeting: {
      uri: head["meeting"],
      type: head["meetingType"],
      plannedStart: head["plannedStart"],
    },
  } as Agenda;
}

async function updatePieceName(
  pieceUri: string,
  newName: string
): Promise<void> {
  const queryString = `
    ${prefixHeaderLines.dct}

    DELETE WHERE {
      GRAPH ${sparqlEscapeUri(CONSTANTS.GRAPHS.KANSELARIJ)} {
        ${sparqlEscapeUri(pieceUri)} dct:title ?title .
      }
    }
    ;
    INSERT DATA {
      GRAPH ${sparqlEscapeUri(CONSTANTS.GRAPHS.KANSELARIJ)} {
        ${sparqlEscapeUri(pieceUri)} dct:title ${sparqlEscapeString(newName)} .
      }
    }
  `;

  await update(queryString);
}

// TODO which graphs are needed here?
async function updateAgendaActivityNumber(
  agendaitemUri: string,
  agendaActivityNumber: number
): Promise<void> {
  const queryString = `
    ${prefixHeaderLines.adms}
    ${prefixHeaderLines.besluitvorming}
    ${prefixHeaderLines.ext}
    ${prefixHeaderLines.prov}
    INSERT {
      GRAPH ${sparqlEscapeUri(CONSTANTS.GRAPHS.KANSELARIJ)} {
        ?subcase adms:identifier ${sparqlEscapeInt(agendaActivityNumber)}
      }
    }
    WHERE {
      GRAPH ${sparqlEscapeUri(CONSTANTS.GRAPHS.KANSELARIJ)} {
        ${sparqlEscapeUri(agendaitemUri)}
          ^besluitvorming:genereertAgendapunt
          / prov:wasInformedBy
          / ext:indieningVindtPlaatsTijdens ?subcase .

        FILTER(NOT EXISTS { ?subcase adms:identifier [] } ) .
      }
    }
  `;

  await update(queryString);
}

export {
  getSortedAgendaitems,
  getPiecesForAgenda,
  getLastAgendaActivityNumber,
  getAgenda,
  updatePieceName,
  updateAgendaActivityNumber,
};
