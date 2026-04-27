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
  id: string;
  uri: string;
  subcaseUri: string;
  subcaseType: string;
  type: string;
  agendaActivityNumber?: number;
  isPostponed: boolean;
};

type Piece = {
  uri: string;
  title: string;
  type?: string;
  position?: number;
  fileExtension: string;
  revision: number;
};

type Subcase = {
  uri: string;
  type: string;
  agendaitemType: string;
  agendaActivityNumber: number;
  meetingType: string;
  pieceName: string;
};

export {
  Agenda,
  Meeting,
  Agendaitem,
  Piece,
  Subcase
}
