import { sparqlEscapeUri, sparqlEscapeInt } from "mu";
import { updateSudo } from "@lblod/mu-auth-sudo";
import CONSTANTS from "../constants";

async function addAgendaSubcaseId(
  subcase: string,
  agendaActivityNumber: number
): Promise<void> {
  const queryString = `PREFIX adms: <http://www.w3.org/ns/adms#>
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
