import { query, sparqlEscapeUri } from "mu";
import { parseAndReshape, prefixHeaderLines } from "./sparql-utils";
import CONSTANTS from "../constants";
import { Piece } from "../types/types";

async function getAgendaitemPieces(agendaitem: string): Promise<Piece[]> {
  const queryString = `
    ${prefixHeaderLines.besluitvorming}
    ${prefixHeaderLines.dbpedia}
    ${prefixHeaderLines.dct}
    ${prefixHeaderLines.dossier}
    ${prefixHeaderLines.mu}
    ${prefixHeaderLines.pav}
    ${prefixHeaderLines.prov}
    ${prefixHeaderLines.schema}
    ${prefixHeaderLines.skos}

    SELECT ?piece ?pieceName ?pieceType ?piecePosition
      ?fileExtension (COUNT(?prevVersion) as ?revisionNumber)
    FROM ${sparqlEscapeUri(CONSTANTS.GRAPHS.PUBLIC)}
    FROM ${sparqlEscapeUri(CONSTANTS.GRAPHS.KANSELARIJ)}
    WHERE {
      ?piece pav:previousVersion* ?prevVersion .
      {
        SELECT DISTINCT ?piece ?pieceName ?pieceType 
          ?piecePosition ?fileExtension
        WHERE {
          ${sparqlEscapeUri(agendaitem)} 
            besluitvorming:geagendeerdStuk ?piece .
          ?piece
            dct:title ?pieceName ;
            prov:value / dbpedia:fileExtension ?fileExtension .
          FILTER NOT EXISTS { ?piece dct:alternative ?originalName }
          ?documentContainer 
            dossier:Collectie.bestaatUit ?piece ; 
            schema:position ?piecePosition .
          OPTIONAL { ?documentContainer dct:type/skos:prefLabel ?pieceType . }
        }
      }
    }
    ORDER BY ?piecePosition
  `;

  const response = await query(queryString);
  const results = parseAndReshape(response, {
    kind: "resource",
    idProp: "piece",
    destIdProp: "uri",
    propShapers: {
      title: { kind: "literal", sourceProp: "pieceName" },
      type: { kind: "literal", sourceProp: "pieceType" },
      position: { kind: "literal", sourceProp: "piecePosition" },
      fileExtension: { kind: "literal", sourceProp: "fileExtension" },
      revision: { kind: "literal", sourceProp: "revisionNumber" },
    },
  });

  return results as Piece[];
}

export { getAgendaitemPieces };
