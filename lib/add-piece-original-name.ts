import { sparqlEscapeUri, sparqlEscapeString } from "mu";
import { updateSudo } from "@lblod/mu-auth-sudo";
import CONSTANTS from "../constants";
import { prefixHeaderLines } from "./sparql-utils";

async function addPieceOriginalName(
  piece: string,
  originalName: string
): Promise<void> {
  const queryString = `
  ${prefixHeaderLines.dct}

INSERT DATA {
  GRAPH ${sparqlEscapeUri(CONSTANTS.GRAPHS.KANSELARIJ)} {
    ${sparqlEscapeUri(piece)} dct:alternative ${sparqlEscapeString(
    originalName
  )} .
  }
}`;
  await updateSudo(queryString);
}

export { addPieceOriginalName };
