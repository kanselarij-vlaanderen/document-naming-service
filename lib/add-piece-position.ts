import { sparqlEscapeUri, sparqlEscapeInt } from "mu";
import { updateSudo } from "@lblod/mu-auth-sudo";
import CONSTANTS from "../constants";
import { prefixHeaderLines } from "./sparql-utils";

async function addPiecePosition(
  piece: string,
  position: number
): Promise<void> {
  const queryString = `
  ${prefixHeaderLines.schema}

INSERT DATA {
  GRAPH ${sparqlEscapeUri(CONSTANTS.GRAPHS.KANSELARIJ)} {
    ${sparqlEscapeUri(piece)} schema:position ${sparqlEscapeInt(position)} .
  }
}`;
  await updateSudo(queryString);
}

export { addPiecePosition };
