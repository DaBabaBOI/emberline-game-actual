import { supabase } from "@/lib/supabase";
import { nextMeters, statusAfterTurn, STARTING_METER_VALUE } from "@/lib/game";
import type { ActionOption, PlayerRow, RoomRow } from "@/types";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I

export function generateRoomCode(length = 5) {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

const STARTING_METERS = {
  education: STARTING_METER_VALUE,
  energy: STARTING_METER_VALUE,
  sustainability: STARTING_METER_VALUE,
  currency: STARTING_METER_VALUE,
};

export async function createRoom(playerName: string) {
  const code = generateRoomCode();

  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .insert({ code, status: "lobby" })
    .select()
    .single<RoomRow>();
  if (roomError || !room) throw roomError ?? new Error("Failed to create room");

  const { data: player, error: playerError } = await supabase
    .from("players")
    .insert({
      room_id: room.id,
      name: playerName,
      seat_order: 0,
      meters: STARTING_METERS,
    })
    .select()
    .single<PlayerRow>();
  if (playerError || !player)
    throw playerError ?? new Error("Failed to join room");

  return { room, player };
}

export async function joinRoom(code: string, playerName: string) {
  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select()
    .eq("code", code.toUpperCase())
    .single<RoomRow>();
  if (roomError || !room) throw new Error("Room not found");
  if (room.status !== "lobby") throw new Error("That game already started");

  const { data: existingPlayers, error: playersError } = await supabase
    .from("players")
    .select()
    .eq("room_id", room.id)
    .returns<PlayerRow[]>();
  if (playersError) throw playersError;

  const seatOrder = (existingPlayers ?? []).length;

  const { data: player, error: playerError } = await supabase
    .from("players")
    .insert({
      room_id: room.id,
      name: playerName,
      seat_order: seatOrder,
      meters: STARTING_METERS,
    })
    .select()
    .single<PlayerRow>();
  if (playerError || !player)
    throw playerError ?? new Error("Failed to join room");

  return { room, player };
}

export async function startGame(room: RoomRow, players: PlayerRow[]) {
  const first = [...players].sort((a, b) => a.seat_order - b.seat_order)[0];
  if (!first) throw new Error("Need at least one player to start");

  const { error } = await supabase
    .from("rooms")
    .update({ status: "playing", current_player_id: first.id })
    .eq("id", room.id);
  if (error) throw error;
}

function nextActivePlayer(players: PlayerRow[], afterSeatOrder: number) {
  const sorted = [...players].sort((a, b) => a.seat_order - b.seat_order);
  const ordered = [
    ...sorted.filter((p) => p.seat_order > afterSeatOrder),
    ...sorted.filter((p) => p.seat_order <= afterSeatOrder),
  ];
  return ordered.find((p) => p.status === "playing") ?? null;
}

export async function submitAction(
  room: RoomRow,
  players: PlayerRow[],
  actingPlayer: PlayerRow,
  action: ActionOption,
) {
  const meters = nextMeters(actingPlayer.meters, action);
  const status = statusAfterTurn(meters, actingPlayer.turn);

  const builds = [...actingPlayer.builds, action.id];

  const { error: playerError } = await supabase
    .from("players")
    .update({ meters, turn: actingPlayer.turn + 1, builds, status })
    .eq("id", actingPlayer.id);
  if (playerError) throw playerError;

  await supabase.from("turn_log").insert({
    room_id: room.id,
    player_id: actingPlayer.id,
    message: `${actingPlayer.name} — Turn ${actingPlayer.turn}: ${action.label}`,
  });

  const updatedPlayers = players.map((p) =>
    p.id === actingPlayer.id
      ? { ...p, meters, status, turn: p.turn + 1, builds }
      : p,
  );

  if (status === "won") {
    await supabase
      .from("rooms")
      .update({ status: "finished", current_player_id: actingPlayer.id })
      .eq("id", room.id);
    return;
  }

  const next = nextActivePlayer(updatedPlayers, actingPlayer.seat_order);
  if (!next) {
    await supabase
      .from("rooms")
      .update({ status: "finished", current_player_id: null })
      .eq("id", room.id);
    return;
  }

  await supabase
    .from("rooms")
    .update({ current_player_id: next.id })
    .eq("id", room.id);
}
