export type MeterKey = "education" | "energy" | "sustainability";

export type Meters = Record<MeterKey, number>;

export interface ActionOption {
  id: string;
  label: string;
  description: string;
  effects: Partial<Meters>;
}

export type GameStatus = "playing" | "won" | "lost";

export interface GameState {
  turn: number;
  meters: Meters;
  log: string[];
  status: GameStatus;
}
