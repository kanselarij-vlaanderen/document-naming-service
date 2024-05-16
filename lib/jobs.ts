import {
  sparqlEscapeString,
  sparqlEscapeUri,
  sparqlEscapeDateTime,
  query,
  update,
  uuid as generateUuid,
} from "mu";
import CONSTANTS from "../constants";
import { Piece } from "../types/types";
import { prefixHeaderLines } from "./sparql-utils";

type DocumentNamingJob = {
  uri: string;
  id: string;
  status: JobStatus;
  created: Date;
};

const RDF_JOB_TYPE = CONSTANTS.JOB.RDF_TYPE;

const jobStatusses = CONSTANTS.JOB.STATUS;
type JobStatus = (typeof jobStatusses)[keyof typeof jobStatusses];

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

async function createNamingJob(pieces: string[]): Promise<DocumentNamingJob> {
  const RESOURCE_BASE = CONSTANTS.JOB.RDF_RESOURCE_BASE;
  const JSONAPI_JOB_TYPE = CONSTANTS.JOB.JSONAPI_JOB_TYPE;
  const { RUNNING } = CONSTANTS.JOB.STATUS;
  const uuid = generateUuid();
  const job = {
    uri: RESOURCE_BASE + `/${JSONAPI_JOB_TYPE}/${uuid}`,
    id: uuid,
    status: RUNNING,
    created: new Date(),
  };
  const queryString = `
  ${prefixHeaderLines.cogs}
  ${prefixHeaderLines.dct}
  ${prefixHeaderLines.ext}
  ${prefixHeaderLines.mu}

  INSERT DATA {
      ${sparqlEscapeUri(job.uri)} a cogs:Job , ${sparqlEscapeUri(
    RDF_JOB_TYPE
  )} ;
          mu:uuid ${sparqlEscapeString(job.id)} ;
          ext:status ${sparqlEscapeString(job.status)} ;
          ${pieces.map((piece) => `prov:used ${sparqlEscapeUri(piece)} ;`)}
          dct:created ${sparqlEscapeDateTime(job.created)} .
  }`;
  await update(queryString);
  return job;
}

async function updateJobStatus(uri: string, status: JobStatus, errorMessage?: string): Promise<void> {
  const { SUCCESS, FAIL } = CONSTANTS.JOB.STATUS;
  const time = new Date();
  let timePred;
  if (status === SUCCESS || status === FAIL) {
    timePred = "http://www.w3.org/ns/prov#endedAtTime";
  } else {
    timePred = "http://www.w3.org/ns/prov#startedAtTime";
  }
  const escapedUri = sparqlEscapeUri(uri);
  const queryString = `
  ${prefixHeaderLines.cogs}
  ${prefixHeaderLines.ext}
  ${prefixHeaderLines.schema}

  DELETE {
      ${escapedUri} ext:status ?status ;
          ${sparqlEscapeUri(timePred)} ?time .
  }
  INSERT {
      ${escapedUri} ext:status ${sparqlEscapeUri(status)} ;
          ${errorMessage ? `schema:error ${sparqlEscapeString(errorMessage)} ;` : ""}
          ${sparqlEscapeUri(timePred)} ${sparqlEscapeDateTime(time)} .
  }
  WHERE {
      ${escapedUri} a ${sparqlEscapeUri(RDF_JOB_TYPE)} .
      OPTIONAL { ${escapedUri} ext:status ?status }
      OPTIONAL { ${escapedUri} ${sparqlEscapeUri(timePred)} ?time }
  }`;
  await update(queryString);
}

export { DocumentNamingJob, jobExists, createNamingJob, updateJobStatus };
