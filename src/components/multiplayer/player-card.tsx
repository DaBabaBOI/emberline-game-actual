import type { PlayerRow } from "@/types";
import { METER_COLORS, METER_ICONS, METER_KEYS, METER_LABELS, WIN_THRESHOLD } from "@/lib/game";
import { MeterBar } from "@/components/game/meter-bar";
import { IslandBoard } from "@/components/game/island-board";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface PlayerCardProps {
  player: PlayerRow;
  isYou: boolean;
  isCurrentTurn: boolean;
}

export function PlayerCard({ player, isYou, isCurrentTurn }: PlayerCardProps) {
  return (
    <Card className={cn(isCurrentTurn && "border-primary")}>
      <CardHeader className="flex items-center justify-between gap-2">
        <span className="font-medium">
          {player.name}
          {isYou ? " (you)" : ""}
        </span>
        {player.status !== "playing" ? (
          <span className="text-sm text-muted-foreground">
            {player.status === "won" ? "Won" : "Out"}
          </span>
        ) : isCurrentTurn ? (
          <span className="text-sm text-muted-foreground">Current turn</span>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <IslandBoard builds={player.builds} size="sm" />
        {METER_KEYS.map((key) => (
          <MeterBar
            key={key}
            label={METER_LABELS[key]}
            value={player.meters[key]}
            goal={WIN_THRESHOLD}
            color={METER_COLORS[key].bar}
            icon={METER_ICONS[key]}
          />
        ))}
      </CardContent>
    </Card>
  );
}
