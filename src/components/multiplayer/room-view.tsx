"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getStoredPlayerId } from "@/lib/player-storage";
import type { PlayerRow, RoomRow, TurnLogRow } from "@/types";
import { JoinForm } from "@/components/multiplayer/join-form";
import { Lobby } from "@/components/multiplayer/lobby";
import { MultiplayerBoard } from "@/components/multiplayer/multiplayer-board";
import { Card, CardContent } from "@/components/ui/card";

export interface RoomViewProps {
  code: string;
}

export function RoomView({ code }: RoomViewProps) {
  const [room, setRoom] = useState<RoomRow | null>(null);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [log, setLog] = useState<string[]>([]);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function load() {
      const { data: roomRow } = await supabase
        .from("rooms")
        .select()
        .eq("code", code)
        .single<RoomRow>();

      if (cancelled) return;
      if (!roomRow) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const [{ data: playerRows }, { data: logRows }] = await Promise.all([
        supabase
          .from("players")
          .select()
          .eq("room_id", roomRow.id)
          .returns<PlayerRow[]>(),
        supabase
          .from("turn_log")
          .select()
          .eq("room_id", roomRow.id)
          .order("created_at", { ascending: true })
          .returns<TurnLogRow[]>(),
      ]);

      if (cancelled) return;
      setRoom(roomRow);
      setPlayers(playerRows ?? []);
      setLog((logRows ?? []).map((entry) => entry.message));
      setMyPlayerId(getStoredPlayerId(code));
      setLoading(false);

      channel = supabase
        .channel(`room-${roomRow.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "rooms",
            filter: `id=eq.${roomRow.id}`,
          },
          (payload) => {
            if (payload.eventType === "DELETE") return;
            setRoom(payload.new as RoomRow);
          },
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "players",
            filter: `room_id=eq.${roomRow.id}`,
          },
          (payload) => {
            const updated = payload.new as PlayerRow | undefined;
            if (!updated) return;
            setPlayers((current) => {
              const exists = current.some((p) => p.id === updated.id);
              return exists
                ? current.map((p) => (p.id === updated.id ? updated : p))
                : [...current, updated];
            });
          },
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "turn_log",
            filter: `room_id=eq.${roomRow.id}`,
          },
          (payload) => {
            const entry = payload.new as TurnLogRow;
            setLog((current) => [...current, entry.message]);
          },
        )
        .subscribe();
    }

    load();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [code]);

  if (loading) {
    return (
      <Card>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading room...</p>
        </CardContent>
      </Card>
    );
  }

  if (notFound || !room) {
    return (
      <Card>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Room {code} doesn&apos;t exist. Double check the code.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!myPlayerId || !players.some((p) => p.id === myPlayerId)) {
    return (
      <JoinForm
        code={code}
        onJoined={(joinedRoom, player) => {
          setRoom(joinedRoom);
          setMyPlayerId(player.id);
          setPlayers((current) =>
            current.some((p) => p.id === player.id)
              ? current
              : [...current, player],
          );
        }}
      />
    );
  }

  if (room.status === "lobby") {
    return <Lobby room={room} players={players} myPlayerId={myPlayerId} />;
  }

  return (
    <MultiplayerBoard
      room={room}
      players={players}
      myPlayerId={myPlayerId}
      log={log}
    />
  );
}
