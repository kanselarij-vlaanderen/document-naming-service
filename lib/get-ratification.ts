import { query, sparqlEscapeUri } from "mu";
import { parseAndReshape, prefixHeaderLines } from "./sparql-utils";
import CONSTANTS from "../constants";
import { Piece } from "../types/types";

export async function getRatification(
  agendaItemUri: string
): Promise<Piece | null> {
  const queryString = `
  ${prefixHeaderLines.besluitvorming}
  ${prefixHeaderLines.ext}
  ${prefixHeaderLines.dbpedia}
  ${prefixHeaderLines.dct}
  ${prefixHeaderLines.prov}
  ${prefixHeaderLines.pav}
  ${prefixHeaderLines.skos}
  ${prefixHeaderLines.dossier}

  SELECT ?piece ?pieceName ?pieceType
    ?fileExtension (COUNT(?prevVersion) as ?revisionNumber)
  FROM ${sparqlEscapeUri(CONSTANTS.GRAPHS.PUBLIC)}
  FROM ${sparqlEscapeUri(CONSTANTS.GRAPHS.KANSELARIJ)}
  WHERE {
    ?piece pav:previousVersion* ?prevVersion .
    {
      SELECT DISTINCT ?piece ?pieceName ?pieceType ?fileExtension
      WHERE {
        ?subcase 
          ^besluitvorming:vindtPlaatsTijdens/besluitvorming:genereertAgendapunt ${sparqlEscapeUri(agendaItemUri)} ; 
          ext:heeftBekrachtiging ?piece .
        FILTER NOT EXISTS { [] pav:previousVersion ?piece }
        ?piece
          dct:title ?pieceName ;
          prov:value / dbpedia:fileExtension ?fileExtension .
        FILTER NOT EXISTS { ?piece dct:alternative ?originalName }
        ?documentContainer 
          dossier:Collectie.bestaatUit ?piece .
        OPTIONAL { ?documentContainer dct:type/skos:prefLabel ?pieceType . }
      }
    }
  } LIMIT 1
  `;
  const response = await query(queryString);
  const reshaped = parseAndReshape(response, {
    kind: "resource",
    idProp: "piece",
    destIdProp: "uri",
    propShapers: {
      title: { kind: "literal", sourceProp: "pieceName" },
      type: { kind: "literal", sourceProp: "pieceType" },
      fileExtension: { kind: "literal", sourceProp: "fileExtension" },
      revision: { kind: "literal", sourceProp: "revisionNumber" },
    },
  });

  const ratification = reshaped[0];
  return (ratification as Piece) ?? null;
}