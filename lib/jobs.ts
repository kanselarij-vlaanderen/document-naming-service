import {
  sparqlEscapeString,
  sparqlEscapeUri,
  sparqlEscapeDateTime,
  query,
  update,
  uuid as generateUuid,
} from "mu";
import CONSTANTS from "../constants";
import { parseSparqlResponse, prefixHeaderLines } from "./sparql-utils";

type DocumentNamingJob = {
  uri: string;
  id: string;
  status: JobStatus;
  created: Date;
};

const RDF_JOB_TYPE = CONSTANTS.JOB.RDF_TYPE;

const jobStatuses = CONSTANTS.JOB.STATUSES;
type JobStatus = (typeof jobStatuses)[keyof typeof jobStatuses];

async function jobExists(uri: string): Promise<boolean> {
  const queryString = `
  ${prefixHeaderLines.mu}
  ASK {
      ${sparqlEscapeUri(uri)} a ${sparqlEscapeUri(RDF_JOB_TYPE)} ;
          mu:uuid ?uuid .
  }`;
  const results = await query(queryString);
  return !!results?.boolean;
}

async function createNamingJob(
  agendaUri: string,
  pieces: string[]
): Promise<DocumentNamingJob> {
  const RESOURCE_BASE = CONSTANTS.JOB.RDF_RESOURCE_BASE;
  const JSONAPI_JOB_TYPE = CONSTANTS.JOB.JSONAPI_JOB_TYPE;
  const { BUSY } = CONSTANTS.JOB.STATUSES;
  const uuid = generateUuid();
  const job = {
    uri: RESOURCE_BASE + `/${JSONAPI_JOB_TYPE}/${uuid}`,
    id: uuid,
    status: BUSY,
    created: new Date(),
  };
  const queryString = `
  ${prefixHeaderLines.cogs}
  ${prefixHeaderLines.dct}
  ${prefixHeaderLines.ext}
  ${prefixHeaderLines.mu}
  ${prefixHeaderLines.prov}
  ${prefixHeaderLines.adms}

  INSERT DATA {
      ${sparqlEscapeUri(job.uri)} a cogs:Job , ${sparqlEscapeUri(
    RDF_JOB_TYPE
  )} ;
          mu:uuid ${sparqlEscapeString(job.id)} ;
          adms:status ${sparqlEscapeString(job.status)} ;
          dct:source ${sparqlEscapeUri(agendaUri)} ;
          ${pieces.map((piece) => `prov:used ${sparqlEscapeUri(piece)} ;`).join('        \n')}
          prov:startedAtTime ${sparqlEscapeDateTime(job.created)} ;
          dct:created ${sparqlEscapeDateTime(job.created)} .
  }`;
  await update(queryString);
  return job;
}

async function updateJobStatus(
  uri: string,
  status: JobStatus,
  errorMessage?: string
): Promise<void> {
  const { SUCCESS, FAILED } = CONSTANTS.JOB.STATUSES;
  const time = new Date();
  let timePred;
  if (status === SUCCESS || status === FAILED) {
    timePred = "http://www.w3.org/ns/prov#endedAtTime";
  } else {
    timePred = "http://www.w3.org/ns/prov#startedAtTime";
  }
  const escapedUri = sparqlEscapeUri(uri);
  const queryString = `
  ${prefixHeaderLines.cogs}
  ${prefixHeaderLines.ext}
  ${prefixHeaderLines.schema}
  ${prefixHeaderLines.adms}

  DELETE {
      ${escapedUri} adms:status ?status ;
          ${sparqlEscapeUri(timePred)} ?time .
  }
  INSERT {
      ${escapedUri} adms:status ${sparqlEscapeUri(status)} ;
          ${
            errorMessage
              ? `schema:error ${sparqlEscapeString(errorMessage)} ;`
              : ""
          }
          ${sparqlEscapeUri(timePred)} ${sparqlEscapeDateTime(time)} .
  }
  WHERE {
      ${escapedUri} a ${sparqlEscapeUri(RDF_JOB_TYPE)} .
      OPTIONAL { ${escapedUri} adms:status ?status }
      OPTIONAL { ${escapedUri} ${sparqlEscapeUri(timePred)} ?time }
  }`;
  await update(queryString);
}

async function latestJobFinishedAt(): Promise<Date | null> {
  const { KANSELARIJ } = CONSTANTS.GRAPHS;
  const { SUCCESS } = CONSTANTS.JOB.STATUSES;
  const queryString = `
    ${prefixHeaderLines.ext}
    ${prefixHeaderLines.prov}
    ${prefixHeaderLines.adms}
    SELECT ?job ?time
    WHERE {
      GRAPH ${sparqlEscapeUri(KANSELARIJ)} {
        ?job
          a ${sparqlEscapeUri(RDF_JOB_TYPE)} ;
          adms:status ${sparqlEscapeUri(SUCCESS)} ;
          prov:endedAtTime ?time .
      }
    } ORDER BY DESC(?time) LIMIT 1
  `;
  const response = await query(queryString);
  const parsed = parseSparqlResponse(response);
  const time = parsed[0]?.["time"];
  if (!time) {
    return null;
  }

  return time as Date;
}

export {
  DocumentNamingJob,
  jobExists,
  createNamingJob,
  updateJobStatus,
  latestJobFinishedAt,
};
