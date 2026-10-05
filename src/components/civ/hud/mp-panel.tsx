"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ERAS, MP } from "@/game/content";
import { defenseStrength } from "@/game/engine";
import { useGame } from "@/components/civ/game-provider";
import { PixelIcon } from "@/components/civ/pixel-icon";
import { cn } from "@/lib/utils";
import { ChatBox } from "./mp-chat";
import { BattleViewer } from "./battle-viewer";
import {
  BOT_NAMES,
  CHAT,
  adaptiveBotScore,
  botActions,
  botRaidSize,
  botScore,
  chatLines,
  cleanChat,
  fightNews,
  fightResult,
  getEvents,
  getSeats,
  reportScore,
  sendChat,
  sendEvent,
  sendFight,
  type ChatLine,
  type Fight,
  type Room,
  type Seat,
  type Session,
} from "@/lib/multiplayer";

export interface Match {
  room: Room;
  session: Session;
  // Who was in the room when it started (the other seats are bots).
  humans: Seat[];
}

// Co-op: the team's target, all XP together, by the time limit.
const COOP_TARGET: Record<Room["speed"], number> = { quick: 3200, normal: 5600, long: 8000 };

type Row = { seat: number; name: string; bot: boolean; xp: number; era: number; sustainability: number; you: boolean };

// The match: the scoreboard (live from the others, worked out for the bots),
// gifts and raids, and the result when time runs out.
export function MultiplayerPanel({ match }: { match: Match }) {
  const { state, dispatch } = useGame();
  const { room, session } = match;
  const [seats, setSeats] = useState<Seat[]>(match.humans);
  const [now, setNow] = useState(() => Date.now());
  const [open, setOpen] = useState(false);
  // The player whose gift and raid buttons are showing.
  const [picked, setPicked] = useState<number | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [raidSize, setRaidSize] = useState(3);
  // The chat: the messages, whether it's open, how many came in while it was
  // closed, and the newest one shown for a few seconds under the menu.
  const [chat, setChat] = useState<ChatLine[]>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [peek, setPeek] = useState<ChatLine | null>(null);
  const chatOpenRef = useRef(false);
  useEffect(() => {
    chatOpenRef.current = chatOpen;
  }, [chatOpen]);
  // Messages from the waiting room are history, not news.
  const firstSync = useRef(true);
  // Raids that came to blows: the one being watched, one offered to watch, and
  // all we've heard of (to match each result with its start).
  const [watch, setWatch] = useState<Fight | null>(null);
  const [offer, setOffer] = useState<Fight | null>(null);
  const fights = useRef(new Map<string, Fight>());
  const raidSeq = useRef(0);
  // A battle's result, as news in the chat (with the count and preview when closed).
  const announce = (text: string, key: string) => {
    const line: ChatLine = { key, from: "", text, mine: false, system: true };
    setChat((c) => [...c, line].slice(-CHAT.keep));
    if (!chatOpenRef.current) {
      setUnread((u) => u + 1);
      setPeek(line);
    }
  };
  const lastEvent = useRef(0);
  const botDone = useRef<number | null>(null);
  const prevRaid = useRef(state.raid);
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });

  const start = Date.parse(room.started_at ?? new Date().toISOString());
  const end = Date.parse(room.ends_at ?? new Date(start + MP.minutes[room.speed] * 60_000).toISOString());
  const minutes = Math.max(0, (Math.min(now, end) - start) / 60_000);
  const over = now >= end;
  const humanSeats = useMemo(() => match.humans.map((h) => h.seat), [match.humans]);
  const plan = useMemo(
    () => botActions(room.seed, [0, 1, 2, 3].filter((n) => !humanSeats.includes(n)), humanSeats, room.mode, MP.minutes[room.speed]),
    [room, humanSeats],
  );

  // The clock, once a second.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Every 3 seconds: send my score, read everyone's, and act on new events for me.
  useEffect(() => {
    let alive = true;
    const sync = async () => {
      const s = stateRef.current;
      if (Date.now() < end + 10_000) reportScore(session, { xp: s.xp ?? 0, era: s.era, sustainability: s.meters.sustainability, population: s.population });
      const [rows, events] = await Promise.all([getSeats(room.code), getEvents(room.code, lastEvent.current)]);
      if (!alive) return;
      if (rows.length) setSeats(rows);
      const incoming = chatLines(events, session.seat, (n) => rows.find((r) => r.seat === n)?.name ?? BOT_NAMES[n], firstSync.current);
      if (incoming.length) {
        setChat((c) => [...c, ...incoming].slice(-CHAT.keep));
        const news = incoming.filter((l) => !l.mine);
        if (!firstSync.current && !chatOpenRef.current && news.length) {
          setUnread((u) => u + news.length);
          setPeek(news[news.length - 1]);
        }
      }
      // Battle news from the others (old news from before I joined is skipped).
      if (!firstSync.current)
        for (const { phase, fight } of fightNews(events.filter((e) => e.from_seat !== session.seat))) {
          if (phase === "start") {
            fights.current.set(fight.id, fight);
            // The attacker watches straight away; anyone not in it may choose to.
            if (fight.attSeat === session.seat) setWatch(fight);
            else if (fight.defSeat !== session.seat) setOffer(fight);
          } else {
            const done = { ...(fights.current.get(fight.id) ?? fight), held: fight.held, avoided: fight.avoided };
            fights.current.set(fight.id, done);
            setWatch((w) => (w?.id === fight.id ? done : w));
            setOffer((o) => (o?.id === fight.id ? null : o));
            announce(fightResult(done, session.seat), `f${fight.id}`);
          }
        }
      firstSync.current = false;
      for (const e of events) {
        lastEvent.current = Math.max(lastEvent.current, e.id);
        if (e.to_seat !== session.seat || e.from_seat === session.seat) continue;
        const from = rows.find((r) => r.seat === e.from_seat)?.name ?? BOT_NAMES[e.from_seat];
        const p = e.payload as Record<string, number>;
        if (e.kind === "gift") dispatch({ type: "mpGiftIn", resources: { food: p.food, wood: p.wood, stone: p.stone, currency: p.currency }, from });
        if (e.kind === "loot") dispatch({ type: "mpLoot", resources: { food: p.food, currency: p.currency }, from });
        if (e.kind === "raid" && room.mode === "race") dispatch({ type: "mpRaidIn", warriors: Number(p.warriors) || 1, from, seat: e.from_seat });
      }
    };
    sync();
    const id = setInterval(sync, 3000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [room, session, end, dispatch]);

  // The bots' raids and gifts aimed at me, when their minute comes (only those
  // after I joined: a reload doesn't replay old ones).
  useEffect(() => {
    if (botDone.current === null) botDone.current = minutes;
    const due = plan.filter((a) => a.at > (botDone.current ?? 0) && a.at <= minutes && a.to === session.seat);
    botDone.current = minutes;
    for (const a of due) {
      if (a.kind === "raid")
        dispatch({ type: "mpRaidIn", warriors: botRaidSize(room.seed, a.from, a.size, defenseStrength(stateRef.current)), from: BOT_NAMES[a.from], seat: a.from });
      else dispatch({ type: "mpGiftIn", resources: { food: MP.giftStep, wood: MP.giftStep }, from: BOT_NAMES[a.from] });
    }
  }, [minutes, plan, session.seat, room.seed, dispatch]);

  // A rival's raid on us comes to blows: tell the room, so they can watch.
  const told = useRef<string | null>(null);
  const fightOf = (r: NonNullable<typeof state.raid>): Fight => ({
    id: `${session.seat}-${r.startTick}`,
    att: r.rival ?? "Raiders",
    def: session.name,
    attSeat: r.rivalSeat ?? -1,
    defSeat: session.seat,
    raiders: Math.round(r.strength / MP.warriorStrength),
    warriors: state.soldiers,
  });
  useEffect(() => {
    const r = state.raid;
    if (!r || r.rivalSeat === undefined || r.fightStart === undefined) return;
    const f = fightOf(r);
    if (told.current === f.id) return;
    told.current = f.id;
    fights.current.set(f.id, f);
    sendFight(session, "start", f);
  });

  // A rival's raid on us is over: tell the room how it ended, and if they won,
  // their warriors take loot home.
  useEffect(() => {
    const before = prevRaid.current;
    prevRaid.current = state.raid;
    if (before?.rivalSeat === undefined || state.raid) return;
    const fought = before.fightStart !== undefined;
    const f = { ...(fights.current.get(`${session.seat}-${before.startTick}`) ?? fightOf(before)), held: fought ? !!state.battle?.won : true, avoided: !fought };
    sendFight(session, "end", f);
    announce(fightResult(f, session.seat), `f${f.id}`);
    if (state.battle && !state.battle.won && humanSeats.includes(before.rivalSeat)) {
      const scale = 1 + state.era * 0.5;
      sendEvent(session, before.rivalSeat, "loot", { food: Math.round(MP.loot.food * scale), currency: Math.round(MP.loot.currency * scale) });
    }
    // fightOf and announce only read refs and setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.raid, state.battle, state.era, session, humanSeats]);

  // Time's up: the game stops.
  useEffect(() => {
    if (over && state.speed !== 0) dispatch({ type: "setSpeed", speed: 0 });
  }, [over, state.speed, dispatch]);

  const humanScores = seats.filter((x) => humanSeats.includes(x.seat)).map((x) => ({ xp: x.xp, era: x.era }));
  const rows: Row[] = [0, 1, 2, 3]
    .map((n) => {
      const human = seats.find((x) => x.seat === n && humanSeats.includes(n));
      if (n === session.seat)
        return { seat: n, name: session.name, bot: false, xp: state.xp ?? 0, era: state.era, sustainability: state.meters.sustainability, you: true };
      if (human) return { seat: n, name: human.name, bot: false, xp: human.xp, era: human.era, sustainability: human.sustainability, you: false };
      // Race: bots keep pace with the humans (their scores as the database has
      // them, so every browser agrees). Co-op: they're teammates, at their own pace.
      const score = room.mode === "race" ? adaptiveBotScore(room.seed, n, minutes, room.speed, humanScores) : botScore(room.seed, n, minutes, room.speed);
      return { seat: n, name: `${BOT_NAMES[n]} (bot)`, bot: true, ...score, you: false };
    })
    .sort((a, b) => b.xp - a.xp);
  const place = rows.findIndex((r) => r.you) + 1;
  const team = rows.reduce((sum, r) => sum + r.xp, 0);
  const left = Math.max(0, Math.round((end - now) / 1000));
  const clock = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;

  // Hide the preview of a new message after a few seconds.
  useEffect(() => {
    if (!peek) return;
    const id = setTimeout(() => setPeek(null), 6000);
    return () => clearTimeout(id);
  }, [peek]);

  const say = async (text: string) => {
    const r = await sendChat(session, text);
    if (r.error) return r.error;
    setChat((c) => [...c, { key: `me${Date.now()}`, from: session.name, text: cleanChat(text), mine: true }].slice(-CHAT.keep));
    return null;
  };

  const flash = (text: string) => {
    setNote(text);
    setTimeout(() => setNote(null), 3000);
  };
  const gift = async (to: Row, kind: "food" | "wood" | "stone" | "currency") => {
    const resources = { [kind]: MP.giftStep };
    if ((state.resources[kind] ?? 0) < MP.giftStep) return flash("Not enough to give.");
    dispatch({ type: "mpGiftOut", resources, to: to.name });
    if (!to.bot) {
      const r = await sendEvent(session, to.seat, "gift", resources);
      if (r.error) flash(r.error);
    }
  };
  const raid = async (to: Row) => {
    const n = Math.min(raidSize, state.soldiers);
    if (n < 1) return flash("Train warriors first.");
    if (state.raid) return flash("Not while we are under attack.");
    dispatch({ type: "mpRaidOut", warriors: n, to: to.name });
    if (!to.bot) {
      const r = await sendEvent(session, to.seat, "raid", { warriors: n });
      if (r.error) flash(r.error);
    } else {
      // Bots defend like an average town of their era.
      const won = n * MP.warriorStrength > 4 + to.era * 4;
      // Show it, and tell the room.
      const f: Fight = { id: `${session.seat}-bot-${now}-${raidSeq.current++}`, att: session.name, def: to.name, attSeat: session.seat, defSeat: to.seat, raiders: n, warriors: Math.round((4 + to.era * 4) / MP.warriorStrength), held: !won };
      setWatch(f);
      sendFight(session, "start", f).then(() => sendFight(session, "end", f));
      setTimeout(() => announce(fightResult(f, session.seat), `f${f.id}`), 6000);
      if (won) {
        const scale = 1 + state.era * 0.5;
        dispatch({ type: "mpLoot", resources: { food: Math.round(MP.loot.food * scale), currency: Math.round(MP.loot.currency * scale) }, from: to.name });
      } else flash(`${to.name} drove our raiders off.`);
    }
  };

  return (
    <>
      {/* A small side menu: one line until opened; a player's buttons show when you pick them. */}
      <div className="pixel-panel-dark font-pixel pointer-events-auto w-56 text-[11px] text-white" data-testid="mp-panel">
        <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-2 px-2 py-1" aria-expanded={open}>
          <span className="flex items-center gap-1 font-semibold">
            <PixelIcon name={room.mode === "race" ? "crown" : "hand"} size={14} />
            {room.mode === "race" ? `${ordinal(place)} of 4` : `Team ${team}/${COOP_TARGET[room.speed]}`}
            <span className="text-white/60">{open ? "▴" : "▾"}</span>
          </span>
          <span className={cn("font-num text-sm", left < 60 && "text-red-300")} data-testid="mp-clock">
            {clock}
          </span>
        </button>
        <div className="border-t-2 border-white/10 px-2 py-1">
          <button
            type="button"
            onClick={() => {
              setChatOpen(!chatOpen);
              setUnread(0);
              setPeek(null);
            }}
            className="flex w-full items-center justify-between gap-2 text-left"
            aria-expanded={chatOpen}
            data-testid="mp-chat-toggle"
          >
            <span className="flex items-center gap-1 font-semibold">
              <PixelIcon name="speaker" size={14} />
              Chat <span className="text-white/60">{chatOpen ? "▴" : "▾"}</span>
            </span>
            {unread > 0 && !chatOpen && (
              <span className="bg-amber-400 px-1 text-[10px] font-bold text-[#2b2119]" data-testid="mp-chat-unread">
                {unread}
              </span>
            )}
          </button>
          {peek && !chatOpen && (
            <span className="mt-0.5 block truncate text-[10px] text-white/80" data-testid="mp-chat-peek">
              <span className="text-sky-200">{peek.from}:</span> {peek.text}
            </span>
          )}
          {chatOpen && (
            <div className="mt-1">
              <ChatBox dark lines={chat} onSend={say} />
            </div>
          )}
        </div>
        {open && (
          <div className="flex flex-col border-t-2 border-white/10 px-2 py-1">
            {rows.map((r, i) => (
              <div key={r.seat}>
                <button
                  type="button"
                  disabled={r.you || over}
                  onClick={() => setPicked(picked === r.seat ? null : r.seat)}
                  className={cn("flex w-full items-center justify-between gap-1 py-0.5 text-left", r.you ? "text-amber-300" : "hover:text-amber-200", picked === r.seat && "text-amber-200")}
                  title={r.you ? undefined : "Gift or raid"}
                >
                  <span className="truncate">
                    {room.mode === "race" ? `${i + 1}. ` : ""}
                    {r.you ? "You" : r.name}
                  </span>
                  <span className="font-num shrink-0" title={`${ERAS[r.era]?.name}, land health ${r.sustainability}`}>
                    {Math.round(r.xp)} XP{r.sustainability < MP.drainBelow ? " ▼" : ""}
                  </span>
                </button>
                {picked === r.seat && !r.you && !over && (
                  <span className="mb-1 flex flex-wrap gap-1">
                    {(["food", "wood", "currency"] as const).map((k) => (
                      <button key={k} type="button" onClick={() => gift(r, k)} className="pixel-btn bg-emerald-800 px-1 py-0.5 text-[10px]">
                        +{MP.giftStep} {k === "currency" ? "coins" : k}
                      </button>
                    ))}
                    {room.mode === "race" && (
                      <button
                        type="button"
                        onClick={() => raid(r)}
                        className="pixel-btn bg-red-800 px-1 py-0.5 text-[10px]"
                        title="They don't come back, but if they win they send loot home"
                      >
                        Raid ({Math.min(raidSize, state.soldiers)})
                      </button>
                    )}
                    {room.mode === "race" && (
                      <span className="flex items-center text-[10px] text-white/70">
                        <button type="button" onClick={() => setRaidSize(Math.max(1, raidSize - 1))} className="px-1">
                          −
                        </button>
                        <button type="button" onClick={() => setRaidSize(raidSize + 1)} className="px-1">
                          +
                        </button>
                      </span>
                    )}
                  </span>
                )}
              </div>
            ))}
            <span className="mt-0.5 text-[10px] text-white/50">Tap a player to gift or raid. ▼: land under {MP.drainBelow}, losing XP.</span>
            {note && <span className="text-[10px] text-amber-200">{note}</span>}
          </div>
        )}
      </div>
      {offer && !watch && (
        <div className="pixel-panel-dark font-pixel pointer-events-auto mt-1 flex w-56 items-center justify-between gap-1 px-2 py-1 text-[11px] text-white" data-testid="fight-offer">
          <span className="flex items-center gap-1 truncate">
            <PixelIcon name="sword" size={14} />
            {offer.att} raids {offer.def}
          </span>
          <span className="flex shrink-0 gap-1">
            <button
              type="button"
              onClick={() => {
                setWatch(offer);
                setOffer(null);
              }}
              className="pixel-btn bg-amber-400 px-1.5 text-[10px] font-semibold text-[#2b2119]"
              data-testid="fight-watch"
            >
              Watch
            </button>
            <button type="button" onClick={() => setOffer(null)} className="px-1 text-white/70" aria-label="Don't watch">
              ×
            </button>
          </span>
        </div>
      )}
      {watch && <BattleViewer key={watch.id} fight={watch} mySeat={session.seat} onClose={() => setWatch(null)} />}
      {over && <MatchResult rows={rows} mode={room.mode} target={COOP_TARGET[room.speed]} team={team} />}
    </>
  );
}

function ordinal(n: number) {
  return n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`;
}

function MatchResult({ rows, mode, target, team }: { rows: Row[]; mode: Room["mode"]; target: number; team: number }) {
  const [shown, setShown] = useState(true);
  if (!shown) return null;
  const you = rows.find((r) => r.you)!;
  const won = mode === "race" ? rows[0].you : team >= target;
  return (
    <div className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-3" data-testid="mp-result">
      <div className="pixel-panel w-[min(94vw,460px)] p-4">
        <h2 className="font-pixel mb-1 text-2xl font-bold">{won ? (mode === "race" ? "You won the race!" : "Your team made it!") : mode === "race" ? "Time's up" : "Not quite"}</h2>
        <p className="mb-3 text-sm text-stone-600">
          {mode === "race"
            ? `${rows[0].name} finished first with ${Math.round(rows[0].xp)} XP. You: ${Math.round(you.xp)} XP.`
            : `Together: ${team} of ${target} XP.`}
        </p>
        <ol className="font-pixel mb-3 flex flex-col gap-1 text-sm">
          {rows.map((r, i) => (
            <li key={r.seat} className={cn("flex justify-between", r.you && "text-emerald-700")}>
              <span>
                {i + 1}. {r.name}
              </span>
              <span className="font-num">
                {Math.round(r.xp)} XP · land {r.sustainability}
              </span>
            </li>
          ))}
        </ol>
        <button type="button" onClick={() => setShown(false)} className="pixel-btn font-pixel bg-amber-400 px-4 py-1.5 font-semibold text-stone-900">
          Look around
        </button>
      </div>
    </div>
  );
}
