import {
  updatePieceName,
  updateSignedPieceNames,
  updateFlattenedPieceNames,
} from "./queries";
import { Piece } from "../types/types";
import VRDocumentName from './vr-document-name';

async function replacePieceVRNameDate(pieces: Piece[], date_to: Date): Promise<void> {
  for (const piece of pieces) {
    const pieceName = new VRDocumentName(piece.title);
    const newPieceName = pieceName.vrDateReplaced(date_to);
    console.log('going to change name from: ', pieceName.name, ' to: ', newPieceName);
    if (newPieceName !== pieceName.name) {
      // any draft pieces are not updated but could have the old VR number
      await updatePieceName(piece.uri, newPieceName);
      // original name does not change once set
      await updateSignedPieceNames(piece.uri, newPieceName);
      await updateFlattenedPieceNames(piece.uri, newPieceName);
    }
  }
  return;
}

export {
  replacePieceVRNameDate,
}
