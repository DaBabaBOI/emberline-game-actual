"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { joinRoom } from "@/lib/multiplayer";
import { setStoredPlayerId } from "@/lib/player-storage";
import type { PlayerRow, RoomRow } from "@/types";

export interface JoinFormProps {
  code: string;
  onJoined: (room: RoomRow, player: PlayerRow) => void;
}

export function JoinForm({ code, onJoined }: JoinFormProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleJoin() {
    if (!name.trim()) {
      setError("Enter your name first.");
      return;
    }
    setError(null);
    setPending(true);
    try {
      const { room, player } = await joinRoom(code, name.trim());
      setStoredPlayerId(room.code, player.id);
      onJoined(room, player);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't join that room.");
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <p className="font-medium">Join room {code}</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Your name
          <input
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Aarav"
          />
        </label>
        <Button onClick={handleJoin} disabled={pending}>
          Join
        </Button>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
