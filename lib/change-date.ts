import { format } from 'date-fns';
import {
  updatePieceName,
  updateSignedPieceNames,
  updateFlattenedPieceNames,
  getPiecesForMeetingStartingWith,
} from "./queries";
import { Meeting, Piece } from "../types/types";

import VRDocumentName from './vr-document-name';


async function processDateChange(meeting: Meeting, date_from: Date, date_to: Date): Promise<Piece[] | null> {

  // ratifications
  const formattedDateFrom = `VR ${format(date_from, 'yyyy ddMM')}`;
  const piecesResults = await getPiecesForMeetingStartingWith(meeting.uri, formattedDateFrom);
  // TODO get ratification
  // const ratification = await getRatification(agendaitem.uri);

  // list with used / generated? generated doesn't seem right?
  // just so we can indicate which documents we have NOT renamed?
  // or to offer a list of documents we DID rename? will that help in any way?
  for (const piece of piecesResults) {
    const pieceName = new VRDocumentName(piece.title);
    const newPieceName = pieceName.vrDateReplaced(date_to);
    console.log('going to change name from: ', pieceName.name, ' to: ', newPieceName);
    
    if (newPieceName !== pieceName.name) {
      await updatePieceName(piece.uri, newPieceName);
      await updateSignedPieceNames(piece.uri, newPieceName);
      await updateFlattenedPieceNames(piece.uri, newPieceName);
    }
  }

  // TODO we don't return if it fails....
  return piecesResults;
}


export {
  processDateChange,
}
