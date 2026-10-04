"use client";

import { useEffect, useState } from "react";
import { MP } from "@/game/content";
import {
  BOT_NAMES,
  createRoom,
  getRoom,
  getSeats,
  joinRoom,
  leaveRoom,
  openRooms,
  saveSession,
  shareLink,
  startRoom,
  type Mode,
  type Room,
  type Seat,
  type Session,
  type Speed,
} from "@/lib/multiplayer";
import { cn } from "@/lib/utils";
import { PixelIcon } from "@/components/civ/pixel-icon";

const SPEEDS: { id: Speed; label: string }[] = [
  { id: "quick", label: `Quick: ${MP.minutes.quick} min, 3x faster learning` },
  { id: "normal", label: `Normal: ${MP.minutes.normal} min, 2x` },
  { id: "long", label: `Long: ${MP.minutes.long} min, 1x` },
];

// Play with others: make a room (race or co-op), join one by its 4-letter code
// or a shared link, or pick an open one. Up to 4 seats; bots fill the rest.
export function MultiplayerLobby({
  initialCode,
  onBack,
  onStart,
}: {
  initialCode?: string;
  onBack: () => void;
  onStart: (room: Room, session: Session, seats: Seat[]) => void;
}) {
  const [name, setName] = useState("");
  const [code, setCode] = useState(initialCode ?? "");
  const [mode, setMode] = useState<Mode>("race");
  const [speed, setSpeed] = useState<Speed>("quick");
  const [listed, setListed] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [open, setOpen] = useState<Room[]>([]);

  // The open rooms, refreshed while choosing.
  useEffect(() => {
    if (session) return;
    let alive = true;
    const load = () => openRooms().then((r) => alive && setOpen(r));
    load();
    const id = setInterval(load, 5000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [session]);

  const enter = async (make: () => Promise<{ session?: Session; error?: string }>) => {
    setBusy(true);
    setError(null);
    const r = await make();
    setBusy(false);
    if (r.error || !r.session) return setError(r.error ?? "Something went wrong.");
    saveSession(r.session);
    setSession(r.session);
  };

  if (session) return <WaitingRoom session={session} onStart={onStart} onLeave={() => setSession(null)} />;

  const who = name.trim() || "Chief";
  return (
    <main className="min-h-dvh bg-[#e8f4fb] px-4 py-8">
      <div className="mx-auto flex max-w-xl flex-col gap-4">
        <button type="button" onClick={onBack} className="font-pixel self-start text-sm underline">
          ◀ Back
        </button>
        <h1 className="font-pixel text-3xl font-bold">Play together</h1>
        <p className="text-sm text-stone-600">
          Up to 4 players, each on the same island. Bots take the empty seats. The highest Chief XP when time runs out wins (or, in co-op, all of you
          together). A damaged land costs XP every minute; a new era is worth a lot.
        </p>

        <label className="font-pixel block">
          <span className="mb-1 block font-semibold">Your people&apos;s name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 24))}
            placeholder="Chief"
            maxLength={24}
            className="w-full border-[3px] border-[#2b2119] bg-white px-3 py-2 outline-none focus:bg-amber-50"
            data-testid="mp-name"
          />
        </label>

        <div className="pixel-panel flex flex-col gap-2 p-4">
          <h2 className="font-pixel text-lg font-semibold">Join a room</h2>
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4))}
              placeholder="ABCD"
              className="font-pixel w-28 border-[3px] border-[#2b2119] bg-white px-3 py-2 text-center text-lg tracking-[0.3em] outline-none"
              data-testid="mp-code"
            />
            <button
              type="button"
              disabled={busy || code.length !== 4}
              onClick={() => enter(() => joinRoom(code, who))}
              className="pixel-btn font-pixel flex-1 bg-amber-400 px-3 py-2 font-semibold text-stone-900 disabled:opacity-50"
              data-testid="mp-join"
            >
              Join
            </button>
          </div>
          {open.length > 0 && (
            <div className="flex flex-col gap-1" data-testid="mp-open-rooms">
              <span className="text-xs text-stone-600">Open rooms:</span>
              {open.map((r) => (
                <button
                  key={r.code}
                  type="button"
                  disabled={busy}
                  onClick={() => enter(() => joinRoom(r.code, who))}
                  className="pixel-btn flex items-center justify-between bg-white px-3 py-1.5 text-left text-sm"
                >
                  <span>
                    <span className="font-pixel font-semibold">{r.host_name}</span> · {r.mode === "race" ? "Race" : "Co-op"} · {r.speed}
                  </span>
                  <span className="font-pixel tracking-widest">{r.code}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="pixel-panel flex flex-col gap-3 p-4">
          <h2 className="font-pixel text-lg font-semibold">Make a room</h2>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["race", "Race", "Most XP wins. Send gifts, or warriors to raid each other."],
                ["coop", "Co-op", "One team: share gifts and beat the target together. No raids."],
              ] as const
            ).map(([id, label, text]) => (
              <button
                key={id}
                type="button"
                onClick={() => setMode(id)}
                className={cn("pixel-btn p-2 text-left text-xs", mode === id ? "bg-emerald-600 text-white" : "bg-white")}
                data-testid={`mp-mode-${id}`}
              >
                <span className="font-pixel block text-sm font-semibold">{label}</span>
                {text}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-1">
            {SPEEDS.map((s) => (
              <label key={s.id} className="flex items-center gap-2 text-sm">
                <input type="radio" name="speed" checked={speed === s.id} onChange={() => setSpeed(s.id)} className="accent-emerald-600" />
                {s.label}
              </label>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={listed} onChange={(e) => setListed(e.target.checked)} className="accent-emerald-600" />
            List it under Open rooms (anyone can join)
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={() => enter(() => createRoom(mode, speed, listed, who))}
            className="pixel-btn font-pixel bg-emerald-600 py-2 font-semibold text-white disabled:opacity-50"
            data-testid="mp-create"
          >
            Make a room
          </button>
        </div>
        {error && (
          <p className="pixel-panel p-2 text-sm text-red-700" data-testid="mp-error">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}

// Waiting for the others: the code and link to share, who's in, and (for the
// host) Start. Everyone moves into the game when the host starts it.
function WaitingRoom({ session, onStart, onLeave }: { session: Session; onStart: (room: Room, session: Session, seats: Seat[]) => void; onLeave: () => void }) {
  const [room, setRoom] = useState<Room | null>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const [r, s] = await Promise.all([getRoom(session.code), getSeats(session.code)]);
      if (!alive) return;
      if (r) setRoom(r);
      setSeats(s.filter((x) => !x.gone));
      if (r?.status === "playing") onStart(r, session, s.filter((x) => !x.gone));
      if (r?.status === "done") setError("The host closed this room.");
    };
    load();
    const id = setInterval(load, 2000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [session, onStart]);

  const host = session.seat === 0;
  return (
    <main className="min-h-dvh bg-[#e8f4fb] px-4 py-8">
      <div className="mx-auto flex max-w-xl flex-col gap-4" data-testid="mp-waiting">
        <h1 className="font-pixel text-3xl font-bold">Room {session.code}</h1>
        {room && (
          <p className="text-sm text-stone-600">
            {room.mode === "race" ? "Race" : "Co-op"} · {room.speed} ({MP.minutes[room.speed]} minutes)
          </p>
        )}
        <div className="pixel-panel flex flex-col gap-2 p-4">
          <span className="text-sm">Share the code or the link:</span>
          <span className="font-pixel text-4xl tracking-[0.4em]" data-testid="mp-room-code">
            {session.code}
          </span>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(shareLink(session.code)).then(() => setCopied(true), () => setCopied(false));
            }}
            className="pixel-btn font-pixel self-start bg-white px-3 py-1 text-sm"
          >
            {copied ? "Link copied!" : "Copy link"}
          </button>
        </div>
        <div className="pixel-panel flex flex-col gap-1.5 p-4" data-testid="mp-seats">
          {[0, 1, 2, 3].map((n) => {
            const s = seats.find((x) => x.seat === n);
            return (
              <div key={n} className="flex items-center gap-2 text-sm">
                <PixelIcon name={s ? "person" : "robot"} size={20} />
                <span className="font-pixel font-semibold">{s ? s.name : `${BOT_NAMES[n]} (bot)`}</span>
                {s && n === 0 && <span className="text-xs text-stone-500">host</span>}
                {s && n === session.seat && <span className="text-xs text-emerald-700">you</span>}
              </div>
            );
          })}
        </div>
        {host ? (
          <button
            type="button"
            onClick={async () => {
              const r = await startRoom(session);
              if (r.error) setError(r.error);
            }}
            className="pixel-btn font-pixel bg-emerald-600 py-3 text-lg font-semibold text-white"
            data-testid="mp-start"
          >
            Start the game
          </button>
        ) : (
          <p className="font-pixel text-sm">Waiting for the host to start...</p>
        )}
        <button
          type="button"
          onClick={() => {
            leaveRoom(session);
            saveSession(null);
            onLeave();
          }}
          className="font-pixel self-start text-sm underline"
        >
          Leave the room
        </button>
        {error && <p className="pixel-panel p-2 text-sm text-red-700">{error}</p>}
      </div>
    </main>
  );
}
