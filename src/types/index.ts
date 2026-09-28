export type MeterKey = "education" | "energy" | "sustainability" | "currency";

export type Meters = Record<MeterKey, number>;

export interface ActionOption {
  id: string;
  label: string;
  description: string;
  icon: string;
  color: string;
  effects: Partial<Meters>;
}

export type GameStatus = "playing" | "won" | "lost";

export interface GameState {
  turn: number;
  meters: Meters;
  log: string[];
  builds: string[];
  status: GameStatus;
}

export type RoomStatus = "lobby" | "playing" | "finished";

export interface RoomRow {
  id: string;
  code: string;
  status: RoomStatus;
  current_player_id: string | null;
  created_at: string;
}

export interface PlayerRow {
  id: string;
  room_id: string;
  name: string;
  seat_order: number;
  meters: Meters;
  turn: number;
  builds: string[];
  status: GameStatus;
  joined_at: string;
}

export interface TurnLogRow {
  id: number;
  room_id: string;
  player_id: string | null;
  message: string;
  created_at: string;
}
