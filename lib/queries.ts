import {
  booleanize,
  parseAndReshape,
  parseSparqlResponse,
  prefixHeaderLines,
} from "./sparql-utils";
import { sparqlEscapeString, sparqlEscapeUri, query } from "mu";
import CONSTANTS from "../constants";
import { Agenda, Agendaitem, Piece } from "../types/types";

async function getSortedAgendaitems(agendaId: string): Promise<Agendaitem[]> {
  const queryString = `
    ${prefixHeaderLines.besluitvorming}
    ${prefixHeaderLines.dct}
    ${prefixHeaderLines.ext}
    ${prefixHeaderLines.mu}
    ${prefixHeaderLines.prov}

    SELECT DISTINCT ?agendaitem ?subcaseType 
      ?agendaitemType ?isPostponed WHERE {
      GRAPH ${sparqlEscapeUri(CONSTANTS.GRAPHS.KANSELARIJ)} {
          VALUES ?agendaId { ${sparqlEscapeString(agendaId)} }
          ?agenda 
            mu:uuid ?agendaId ;
            dct:hasPart ?agendaitem .
          ?agendaitem 
            ^besluitvorming:genereertAgendapunt 
            / prov:wasInformedBy 
            / ext:indieningVindtPlaatsTijdens ?subcase .
          OPTIONAL { ?subcase dct:type ?subcaseType }
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
    }
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
  const queryString = `PREFIX prov: <http://www.w3.org/ns/prov#>
PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
PREFIX pav: <http://purl.org/pav/>
PREFIX dct: <http://purl.org/dc/terms/>
PREFIX besluitvor: <https://data.vlaanderen.be/ns/besluitvorming#>
PREFIX dossier: <https://data.vlaanderen.be/ns/dossier#>

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
              MINUS { 
                ?meeting 
                  dct:type ${sparqlEscapeUri(CONSTANTS.MEETING_TYPES.PVV)} . 
              }
            `
              : ""
          }
          FILTER (YEAR(?agendaApprovedDateTime) = ${year})
      }
    }
  `;

  const response = await query(queryString);
  const parsed = parseSparqlResponse(response);
  const maxNumber = parsed[0]?.["maxNumber"];

  if (!maxNumber) {
    return 1;
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
    }
  } as Agenda;
}

export {
  getSortedAgendaitems,
  getPiecesForAgenda,
  getLastAgendaActivityNumber,
  getAgenda,
};
