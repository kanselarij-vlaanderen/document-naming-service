import { app, errorHandler } from "mu";
import { Request, Response } from "express";
import {
  getLastAgendaActivityNumber,
  getSortedAgendaitems,
  getAgenda,
  updatePieceName,
  updateAgendaActivityNumber,
} from "./lib/queries";
import CONSTANTS from "./constants";
import { Agenda, Agendaitem, Piece } from "./types/types";
import { getAgendaitemPieces } from "./lib/get-agendaitem-pieces";
import {
  createNamingJob,
  jobExists,
  latestJobFinishedAt,
  updateJobStatus,
} from "./lib/jobs";
import { getErrorMessage } from "./lib/utils";
import bodyParser from "body-parser";
import { addPieceOriginalName } from "./lib/add-piece-original-name";
import { getRatification } from './lib/get-ratification';

type FileMapping = {
  uri: string;
  generatedName: string;
  agendaitem: Agendaitem;
};

app.use(bodyParser.json());

app.get("/agenda/:agenda_id", getNamedPieces);

app.post("/agenda/:agenda_id", async function (req: Request, res: Response) {
  const agendaId = req.params["agenda_id"];
  if (!agendaId) {
    return res.status(404).send(JSON.stringify({
      error: `No agenda id supplied`
    }));
  }

  const agenda = await getAgenda(agendaId);
  if (!agenda) {
    return res
      .status(404)
      .send(JSON.stringify({
        error: `Agenda with id ${agendaId} could not be found.`
      }));
  }

  if (!req.body.clientUpdateTimestamp) {
    return res.status(400).send(JSON.stringify({
      error: `No clientUpdateTimestamp supplied.`
    }));
  }
  const lastClientUpdateTimestamp = new Date(req.body.clientUpdateTimestamp);
  const latestJobTimestamp = await latestJobFinishedAt();

  if (latestJobTimestamp && latestJobTimestamp > lastClientUpdateTimestamp) {
    return res
      .status(409)
      .send(JSON.stringify({
        error:`Er werd een andere agenda goedgekeurd sinds ${lastClientUpdateTimestamp.toLocaleString('nl-BE')}, ververs de pagina.`,
      }));
  }

  const mappings = req.body.data as FileMapping[];
  if (!mappings) {
    return res.status(400).send(JSON.stringify({
      error: `No piece name mappings supplied`
    }));
  }
  const mappingMap = new Map(
    mappings.map(({ uri, generatedName }) => [uri, generatedName])
  );

  const job = await createNamingJob(
    agenda.uri,
    mappings.map((doc) => doc.uri)
  );

  const authorized = await jobExists(job.uri);
  if (!authorized) {
    return res.status(403).send(JSON.stringify({
      error: "You don't have the required access rights to change change document names",
    }));
  }

  const payload = {
    data: {
      type: CONSTANTS.JOB.JSONAPI_JOB_TYPE,
      id: job.id,
      attributes: {
        uri: job.uri,
        status: job.status,
        created: job.created,
      },
    },
  };

  res.send(payload);


  try {
    const agendaitems = await getSortedAgendaitems(agendaId);
    const counters = await initCounters(agenda);

    for (const agendaitem of agendaitems) {
      const piecesResults = await getAgendaitemPieces(agendaitem.uri);
      const ratification = await getRatification(agendaitem.uri);
      if (ratification) {
        const allPieces = await getAgendaitemPieces(agendaitem.uri, true);
        const maxPosition = Math.max(...allPieces.map((p) => p.position ?? 0));
        ratification.position = maxPosition + 1;
        piecesResults.push(ratification);
      }
      ensureAgendaActivityNumber(agendaitem, agenda, counters);
      if (agendaitem.agendaActivityNumber === undefined)
        throw new Error("No agendaActivityNumber (should never happen)");
      for (const piece of piecesResults) {
        const newName = mappingMap.get(piece.uri) ?? piece.title;
        await updatePieceName(piece.uri, newName);
        await addPieceOriginalName(piece.uri, piece.title);
      }
      await updateAgendaActivityNumber(
        agendaitem.uri,
        agendaitem.agendaActivityNumber
      );
    }
    const { SUCCESS } = CONSTANTS.JOB.STATUS;
    await updateJobStatus(job.uri, SUCCESS);
  } catch (e) {
    const { FAIL } = CONSTANTS.JOB.STATUS;
    await updateJobStatus(job.uri, FAIL, getErrorMessage(e));
  }
  return;
});

function ensureAgendaActivityNumber(
  agendaitem: Agendaitem,
  agenda: Agenda,
  counters: AgendaActivityCounterDict
): void {
  if (agendaitem.agendaActivityNumber === undefined) {
    increaseCounters(agenda, agendaitem, counters);
    agendaitem.agendaActivityNumber = readCounter(agenda, agendaitem, counters);
  }
}

app.use(errorHandler);

type AgendaActivityCounterDict = {
  regular: {
    doc: number;
    med: number;
    dec: number;
  };
  pvv: {
    doc: number;
    med: number;
    dec: number;
  };
};

async function initCounters(
  agenda: Agenda
): Promise<AgendaActivityCounterDict> {
  if (!agenda.meeting.plannedStart) {
    throw new Error("Meeting needs a plannedStart");
  }
  const year = agenda.meeting.plannedStart.getFullYear();
  return {
    regular: {
      doc: await getLastAgendaActivityNumber(year, "nota", false),
      med: await getLastAgendaActivityNumber(year, "announcement", false),
      dec: await getLastAgendaActivityNumber(year, "decree", false),
    },
    pvv: {
      doc: await getLastAgendaActivityNumber(year, "nota", true),
      med: await getLastAgendaActivityNumber(year, "announcement", true),
      dec: await getLastAgendaActivityNumber(year, "decree", true),
    },
  };
}

async function getNamedPieces(req: Request, res: Response) {
  const agendaId = req.params["agenda_id"];
  if (!agendaId) {
    return res.status(404).send(
      JSON.stringify({
        error: `No agenda id supplied`,
      })
    );
  }

  const agenda = await getAgenda(agendaId);
  if (!agenda) {
    return res.status(404).send(
      JSON.stringify({
        error: `Agenda with id ${agendaId} could not be found.`,
      })
    );
  }

  try {
    const agendaitems = await getSortedAgendaitems(agendaId);
    const counters = await initCounters(agenda);

    const mappings: FileMapping[] = [];

    for (const agendaitem of agendaitems) {
      const piecesResults = await getAgendaitemPieces(agendaitem.uri);
      const ratification = await getRatification(agendaitem.uri);
      if (ratification) {
        const allPieces = await getAgendaitemPieces(agendaitem.uri, true);
        const maxPosition = Math.max(...allPieces.map((p) => p.position ?? 0));
        ratification.position = maxPosition + 1;
        piecesResults.push(ratification);
      }
      ensureAgendaActivityNumber(agendaitem, agenda, counters);

      for (const piece of piecesResults) {
        const generatedName = generateName(agenda, agendaitem, piece);
        mappings.push({ uri: piece.uri, generatedName, agendaitem });
      }
    }

    return res.send(mappings);
  } catch (error: any) {
    return res.status(500).send(
      JSON.stringify({
        error: `document-naming service ran into an error: ${error?.message}`,
      })
    );
  }
}

function readCounter(
  agenda: Agenda,
  agendaitem: Agendaitem,
  counters: AgendaActivityCounterDict
): number {
  const { type: agendaitemType, subcaseType } = agendaitem;
  const agendaitemPurpose = getAgendaitemPurpose(agendaitemType, subcaseType);
  const isPvv = agenda.meeting.type === CONSTANTS.MEETING_TYPES.PVV;

  return counters[isPvv ? "pvv" : "regular"][agendaitemPurpose];
}

function getAgendaitemPurpose(
  agendaitemType: string,
  subcaseType: string
): "med" | "doc" | "dec" {
  if (agendaitemType === CONSTANTS.AGENDA_ITEM_TYPES.MEDEDELING) {
    return "med";
  } else if (
    agendaitemType === CONSTANTS.AGENDA_ITEM_TYPES.NOTA &&
    subcaseType === CONSTANTS.SUBCASE_TYPES.BEKRACHTIGING
  ) {
    return "dec";
  } else {
    return "doc";
  }
}

function increaseCounters(
  agenda: Agenda,
  agendaitem: Agendaitem,
  counters: AgendaActivityCounterDict
): void {
  const { type: agendaitemType, subcaseType } = agendaitem;
  const agendaitemPurpose = getAgendaitemPurpose(agendaitemType, subcaseType);
  const isPvv = agenda.meeting.type === CONSTANTS.MEETING_TYPES.PVV;
  counters[isPvv ? "pvv" : "regular"][agendaitemPurpose]++;
}

function generateName(
  agenda: Agenda,
  agendaitem: Agendaitem,
  piece: Piece
): string {
  const { meeting } = agenda;
  const { plannedStart } = meeting;
  const { type: agendaitemType, subcaseType } = agendaitem;
  const agendaitemPurpose = getAgendaitemPurpose(agendaitemType, subcaseType);
  if (!plannedStart) {
    console.warn(
      `Could not create document name for ${piece.uri}, no planned start for meeting ${meeting.uri}`
    );
    return piece.title;
  }
  const isPvv = agenda.meeting.type === CONSTANTS.MEETING_TYPES.PVV;
  const padZeros = (x: unknown, n: number) => String(x).padStart(n, "0");
  const monthPart = padZeros(plannedStart.getMonth() + 1, 2);
  const dayPart = padZeros(plannedStart.getDate(), 2);
  const agendaActivityNumber = agendaitem.agendaActivityNumber;
  const agendaActivityNumberPart = padZeros(agendaActivityNumber, 4);
  const vvPart = isPvv ? "VV " : "";
  const agendaitemPurposePart =
    agendaitemPurpose === "doc"
      ? "DOC"
      : agendaitemPurpose === "med"
      ? "MED"
      : "DEC";
  let documentTypePart = piece.type ? ` - ${piece.type}` : "";
  // if the type is not a capitalized abbreviation it should be all lowercase.
  const lastChar = documentTypePart?.slice(-1);
  if (lastChar && lastChar == lastChar.toLowerCase()) {
    documentTypePart = documentTypePart.toLowerCase() || "";
  }

  const documentVersionPart =
      piece.revision > 1
        ? `${
            CONSTANTS.LATIN_ADVERBIAL_NUMERALS[piece.revision - 1]
          }`.toUpperCase()
        : "";

  const removeVersionSuffix = (title: string) => {
    const versionSuffixes = `${
        `(${Object.values(CONSTANTS.LATIN_ADVERBIAL_NUMERALS)
          .map((suffix) => suffix.toUpperCase())
          .join(')|(')})`
        .replace('()|', '')
        }`;

    const regex = new RegExp(`(.*?)${versionSuffixes}?$`);

    return regex.test(title)
    ? title
      .replace(new RegExp(`${versionSuffixes}$`, 'u'), '')
      .trim()
    : title;
  };

  const title = piece.title.trim();
  const subjectPart = removeVersionSuffix(title);
  const fullGeneratedName = (
    `VR ${plannedStart.getFullYear()} ${dayPart}${monthPart} ${vvPart}` +
    `${agendaitemPurposePart}.${agendaActivityNumberPart}-${piece.position} ` +
    `${subjectPart}${documentTypePart} ${documentVersionPart}`
  );
  return fullGeneratedName.trim();
}
