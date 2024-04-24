import {
  app,
  errorHandler,
  sparqlEscapeString,
  query,
  SparqlClientValue,
} from "mu";
import { Request, Response } from "express";
import { prefixHeaderLines } from "./constants";
import {
  ResourceReshape,
  parseAndReshape,
  parseSparqlResults,
} from "./lib/sparql";

app.get("/agenda/:agenda_id", getNamedPieces);

app.post("/agenda", updatePieces);

app.use(errorHandler);

type Agendaitem = {
  uri: string;
  number: number;
  shortTitle?: string;
  title?: string;
  pieces?: Piece[];
};

type Piece = {
  uri: string;
  title: string;
};

function useVars(vars: Readonly<string[]>): string {
  return vars.map((v) => `?${v}`).join(" ");
}

async function getAgendaitems(agendaId: string): Promise<Agendaitem[]> {
  const vars = [
    "uri",
    "number",
    "shortTitle",
    "title",
    "piece",
    "pieceTitle",
    "accessLevel",
  ] as const;
  const queryString = `
    ${prefixHeaderLines.besluit}
    ${prefixHeaderLines.besluitvorming}
    ${prefixHeaderLines.dct}
    ${prefixHeaderLines.mu}
    ${prefixHeaderLines.schema}

    SELECT ${useVars(vars)}
    WHERE {
      ?agenda
        mu:uuid ${sparqlEscapeString(agendaId)} ;
        dct:hasPart ?uri .
      ?uri
        a besluit:Agendapunt ;        
        besluitvorming:geagendeerdStuk ?piece ;
        schema:position ?number .

      ?piece dct:title ?pieceTitle .
      OPTIONAL { ?piece besluitvorming:vertrouwelijkheidsniveau ?accessLevel . }

      OPTIONAL { ?uri dct:title ?title . }
      OPTIONAL { ?uri besluitvorming:korteTitel ?shortTitle . }
    }
  `;

  const queryResults = await query<(typeof vars)[number]>(queryString);

  const reshapeConfig: ResourceReshape = {
    kind: "resource",
    idProp: "uri",
    propShapers: {
      number: { kind: "literal" },
      title: { kind: "literal" },
      shortTitle: { kind: "literal" },
      pieces: {
        kind: "resource",
        idProp: "piece",
        destIdProp: "uri",
        propShapers: {
          title: { kind: "literal", sourceProp: "pieceTitle" },
          accessLevel: { kind: "literal" },
        },
      },
    },
  };
  const results = parseAndReshape(queryResults, reshapeConfig);
  return results as Agendaitem[];
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

  const results = await query<"uri" | "title">(queryString);
  return parseSparqlResults(results) as Piece[];
}

async function getNamedPieces(req: Request, res: Response) {
  const agendaId = req.params["agenda_id"];
  if (!agendaId) {
    return res
      .status(404)
      .send(`Agenda with id ${agendaId} could not be found`);
  }
  const pieces: (Piece & { newTitle?: string })[] = await getPiecesForAgenda(
    agendaId
  );
  pieces.forEach((piece) => {
    piece.newTitle = piece.title;
  });
  return res.send(pieces);
}

async function updatePieces(req: Request, res: Response) {
  return res.end();
}
