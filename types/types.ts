type Agenda = {
  uri: string;
  meeting: Partial<Meeting>
};

type Meeting = {
  uri: string;
  type: string;
  plannedStart: Date;
  pieces: Piece[];
};

type Agendaitem = {
  uri: string;
  subcaseType: string;
  type: string;
  agendaActivityNumber?: number;
  isPostponed: boolean;
};

type Piece = {
  uri: string;
  title: string;
  type?: string;
  position: number;
  fileExtension: string;
  revision: number;
};

export {
  Agenda,
  Meeting,
  Agendaitem,
  Piece
}