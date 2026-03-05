import { sparqlEscapeUri, sparqlEscapeInt } from "mu";
import { updateSudo } from "@lblod/mu-auth-sudo";
import CONSTANTS from "../constants";
import { prefixHeaderLines } from "./sparql-utils";

async function addAgendaSubcaseId(
  subcase: string,
  agendaActivityNumber: number
): Promise<void> {
  const queryString = `
  ${prefixHeaderLines.adms}

INSERT DATA {
  GRAPH ${sparqlEscapeUri(CONSTANTS.GRAPHS.KANSELARIJ)} {
    ${sparqlEscapeUri(subcase)} adms:identifier ${sparqlEscapeInt(
    agendaActivityNumber
  )} .
  }
}`;
  await updateSudo(queryString);
}

export { addAgendaSubcaseId };
