"use client";

import { useState } from "react";
import {
  ACTIONS,
  MAX_TURNS,
  METER_KEYS,
  METER_LABELS,
  WIN_THRESHOLD,
  applyAction,
  createInitialState,
} from "@/lib/game";
import type { ActionOption } from "@/types";
import { MeterBar } from "@/components/game/meter-bar";
import { ActionList } from "@/components/game/action-list";
import { GameLog } from "@/components/game/game-log";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function CityGame() {
  const [state, setState] = useState(createInitialState);

  function handleSelect(action: ActionOption) {
    setState((current) => applyAction(current, action));
  }

  function handleRestart() {
    setState(createInitialState());
  }

  const isOver = state.status !== "playing";

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-medium">
            Turn {Math.min(state.turn, MAX_TURNS)} / {MAX_TURNS}
          </span>
          <span className="text-sm text-muted-foreground">
            Goal: get every meter to {WIN_THRESHOLD}+
          </span>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {METER_KEYS.map((key) => (
            <MeterBar
              key={key}
              label={METER_LABELS[key]}
              value={state.meters[key]}
              goal={WIN_THRESHOLD}
            />
          ))}
        </CardContent>
      </Card>

      {isOver ? (
        <Card>
          <CardContent className="flex flex-col items-start gap-3">
            <p className="text-lg font-semibold">
              {state.status === "won"
                ? "You built a sustainable city!"
                : "The city didn't make it."}
            </p>
            <Button onClick={handleRestart}>Play again</Button>
          </CardContent>
        </Card>
      ) : (
        <ActionList actions={ACTIONS} onSelect={handleSelect} />
      )}

      <GameLog entries={state.log} />
    </div>
  );
}
