import type { PlayerRow, RoomRow } from "@/types";
import { ACTIONS } from "@/lib/game";
import { submitAction } from "@/lib/multiplayer";
import { PlayerCard } from "@/components/multiplayer/player-card";
import { ActionList } from "@/components/game/action-list";
import { GameLog } from "@/components/game/game-log";
import { Card, CardContent } from "@/components/ui/card";

export interface MultiplayerBoardProps {
  room: RoomRow;
  players: PlayerRow[];
  myPlayerId: string;
  log: string[];
}

export function MultiplayerBoard({
  room,
  players,
  myPlayerId,
  log,
}: MultiplayerBoardProps) {
  const sorted = [...players].sort((a, b) => a.seat_order - b.seat_order);
  const me = players.find((p) => p.id === myPlayerId);
  const isMyTurn = room.status === "playing" && room.current_player_id === myPlayerId;

  if (room.status === "finished") {
    const winner = players.find((p) => p.status === "won");
    return (
      <div className="flex flex-col gap-4">
        <Card>
          <CardContent className="flex flex-col gap-2">
            <p className="text-lg font-semibold">
              {winner
                ? `${winner.name} built a sustainable city!`
                : "Nobody made it this time."}
            </p>
            <p className="text-sm text-muted-foreground">
              Create a new room to play again.
            </p>
          </CardContent>
        </Card>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {sorted.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              isYou={player.id === myPlayerId}
              isCurrentTurn={false}
            />
          ))}
        </div>
        <GameLog entries={log} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {sorted.map((player) => (
          <PlayerCard
            key={player.id}
            player={player}
            isYou={player.id === myPlayerId}
            isCurrentTurn={room.current_player_id === player.id}
          />
        ))}
      </div>

      {isMyTurn && me ? (
        <ActionList
          actions={ACTIONS}
          onSelect={(action) => submitAction(room, players, me, action)}
        />
      ) : (
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Waiting for{" "}
              {players.find((p) => p.id === room.current_player_id)?.name ??
                "the next player"}
              ...
            </p>
          </CardContent>
        </Card>
      )}

      <GameLog entries={log} />
    </div>
  );
}
