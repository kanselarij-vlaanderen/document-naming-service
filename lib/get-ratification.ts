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

  SELECT ?piece ?title ?fileExtension
  WHERE {
    ?subcase 
      ^besluitvorming:vindtPlaatsTijdens/besluitvorming:genereertAgendapunt ${sparqlEscapeUri(agendaItemUri)} ; 
      ext:heeftBekrachtiging ?piece .
    ?piece
      dct:title ?title ;
      prov:value / dbpedia:fileExtension ?fileExtension .
  } LIMIT 1
  `;
  const response = await query(queryString);
  const reshaped = parseAndReshape(response, {
    kind: "resource",
    idProp: "piece",
    destIdProp: "uri",
    propShapers: {
      title: { kind: "literal" },
      type: { kind: "constant", value: CONSTANTS.PIECE_TYPES.RATIFICATION },
      fileExtension: { kind: "literal" },
    },
  });

  const ratification = reshaped[0];
  return (ratification as Piece) ?? null;
}