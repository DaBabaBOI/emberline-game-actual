"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { createRoom, joinRoom } from "@/lib/multiplayer";
import { setStoredPlayerId } from "@/lib/player-storage";

export function CreateJoinPanel() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleCreate() {
    if (!name.trim()) {
      setError("Enter your name first.");
      return;
    }
    setError(null);
    setPending(true);
    try {
      const { room, player } = await createRoom(name.trim());
      setStoredPlayerId(room.code, player.id);
      router.push(`/multiplayer/${room.code}`);
    } catch {
      setError("Couldn't create a room. Try again.");
      setPending(false);
    }
  }

  async function handleJoin() {
    if (!name.trim() || !code.trim()) {
      setError("Enter your name and a room code.");
      return;
    }
    setError(null);
    setPending(true);
    try {
      const { room, player } = await joinRoom(code.trim(), name.trim());
      setStoredPlayerId(room.code, player.id);
      router.push(`/multiplayer/${room.code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't join that room.");
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <p className="font-medium">Multiplayer</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Your name
          <input
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Aarav"
          />
        </label>

        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-1 flex-col gap-1 text-sm">
            Room code
            <input
              className="rounded-md border border-border bg-background px-3 py-2 text-sm uppercase"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. AB12C"
            />
          </label>
          <Button onClick={handleJoin} disabled={pending} variant="secondary">
            Join room
          </Button>
        </div>

        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <div className="h-px flex-1 bg-border" />
          or
          <div className="h-px flex-1 bg-border" />
        </div>

        <Button onClick={handleCreate} disabled={pending}>
          Create a new room
        </Button>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
