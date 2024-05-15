import { app, errorHandler } from "mu";
import { Request, Response } from "express";
import {
  getLastAgendaActivityNumber,
  getSortedAgendaitems,
  getAgenda,
} from "./lib/queries";
import CONSTANTS from "./constants";
import { Agenda, Agendaitem, Piece } from "./types/types";
import { getAgendaitemPieces } from "./lib/get-agendaitem-pieces";

app.get("/agenda/:agenda_id", getNamedPieces);

app.post("/agenda", updatePieces);

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
    throw new Error("Agenda needs a plannedStart");
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
    return res.status(404).send(`No agenda id supplied`);
  }

  const agenda = await getAgenda(agendaId);
  if (!agenda) {
    return res
      .status(404)
      .send(`Agenda with id ${agendaId} could not be found.`);
  }

  console.log(agenda);

  const agendaitems = await getSortedAgendaitems(agendaId);
  const counters = await initCounters(agenda);

  const mappings = [];

  for (const agendaitem of agendaitems) {
    const piecesResults = await getAgendaitemPieces(agendaitem.uri);
    for (const [index, piece] of piecesResults.entries()) {
      const generatedName = generateName(
        agenda,
        agendaitem,
        piece,
        index,
        counters
      );
      increaseCounters(agenda, agendaitem, counters);
      mappings.push({ uri: piece.uri, generatedName });
    }
  }

  return res.send(mappings);
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
  piece: Piece,
  pieceIndex: number,
  counters: AgendaActivityCounterDict
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
  const agendaActivityNumberPart = padZeros(
    counters[isPvv ? "pvv" : "regular"][agendaitemPurpose],
    4
  );
  const vvPart = isPvv ? "VV " : "";
  const subcaseTypePart =
    agendaitemPurpose === "doc"
      ? "DOC"
      : agendaitemPurpose === "med"
      ? "MED"
      : "DEC";

  const documentTypePart = piece.type ? `-${capitalizeString(piece.type)}` : "";

  const documentVersionPart =
    piece.revision > 1
      ? `${
          CONSTANTS.LATIN_ADVERBIAL_NUMERALS[piece.revision - 1]
        } `.toUpperCase()
      : "";

  const fileTypePart = piece.fileExtension;
  const subjectPart = extractSubject(piece.title);
  return (
    `VR ${plannedStart.getFullYear()} ${dayPart}${monthPart} ${vvPart}` +
    `${subcaseTypePart}.${agendaActivityNumberPart}-${pieceIndex + 1} ` +
    `${documentVersionPart}${subjectPart}${documentTypePart}.${fileTypePart}`
  );
}

function capitalizeString(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function extractSubject(pieceTitle: string): string {
  // Might need to edit this regex
  const regex = new RegExp("^(?<subject>.+)-Nota.*$");
  const match = regex.exec(pieceTitle);
  if (!match?.groups?.["subject"]) return "";
  else return match.groups["subject"];
}

async function updatePieces(req: Request, res: Response) {
  return res.end();
}
