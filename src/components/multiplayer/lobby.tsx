import type { PlayerRow, RoomRow } from "@/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { startGame } from "@/lib/multiplayer";

export interface LobbyProps {
  room: RoomRow;
  players: PlayerRow[];
  myPlayerId: string;
}

export function Lobby({ room, players, myPlayerId }: LobbyProps) {
  const sorted = [...players].sort((a, b) => a.seat_order - b.seat_order);
  const isHost = sorted[0]?.id === myPlayerId;
  const canStart = players.length >= 2;

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium">Room {room.code}</p>
        <span className="text-sm text-muted-foreground">
          Share this code with your team
        </span>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ul className="flex flex-col gap-1 text-sm">
          {sorted.map((player) => (
            <li key={player.id}>
              {player.name}
              {player.id === myPlayerId ? " (you)" : ""}
            </li>
          ))}
        </ul>

        {isHost ? (
          <div className="flex flex-col gap-2">
            <Button
              disabled={!canStart}
              onClick={() => startGame(room, players)}
            >
              Start game
            </Button>
            {!canStart ? (
              <p className="text-sm text-muted-foreground">
                Need at least 2 players to start.
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Waiting for the host to start the game...
          </p>
        )}
      </CardContent>
    </Card>
  );
}
