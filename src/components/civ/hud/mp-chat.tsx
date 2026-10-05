"use client";

import { useEffect, useRef, useState } from "react";
import { CHAT, type ChatLine } from "@/lib/multiplayer";
import { cn } from "@/lib/utils";

// The room's chat: the messages, quick phrases (easy on a phone) and a box to
// type in. `dark` for the in-game side menu, light for the waiting room.
export function ChatBox({ lines, onSend, dark = false }: { lines: ChatLine[]; onSend: (text: string) => Promise<string | null>; dark?: boolean }) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const list = useRef<HTMLDivElement>(null);

  // Keep the newest message in view.
  useEffect(() => {
    const el = list.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines.length]);

  const send = async (t: string) => {
    if (busy || !t.trim()) return;
    setBusy(true);
    const err = await onSend(t);
    setBusy(false);
    setError(err);
    if (!err) setText("");
  };

  return (
    <div className="flex flex-col gap-1" data-testid="mp-chat">
      <div ref={list} className={cn("flex max-h-36 min-h-12 flex-col gap-0.5 overflow-y-auto px-1 py-0.5 text-[11px]", dark ? "bg-black/25" : "border-2 border-stone-300 bg-white")}>
        {lines.length === 0 && <span className={dark ? "text-white/50" : "text-stone-500"}>No messages yet. Say hi!</span>}
        {lines.map((l) => (
          <span key={l.key} className={cn("break-words leading-snug", l.system && (dark ? "italic text-amber-200" : "italic text-amber-800"))} data-testid="mp-chat-line">
            {!l.system && (
              <>
                <span className={cn("font-semibold", l.mine ? (dark ? "text-amber-300" : "text-emerald-700") : dark ? "text-sky-200" : "text-indigo-700")}>{l.mine ? "You" : l.from}:</span>{" "}
              </>
            )}
            {l.text}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap gap-1">
        {CHAT.quick.map((q) => (
          <button
            key={q}
            type="button"
            disabled={busy}
            onClick={() => send(q)}
            className={cn("pixel-btn px-1 py-0.5 text-[10px] disabled:opacity-50", dark ? "bg-[#4a3b2e] text-white" : "bg-white")}
          >
            {q}
          </button>
        ))}
      </div>
      <form
        className="flex gap-1"
        onSubmit={(e) => {
          e.preventDefault();
          send(text);
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, CHAT.max))}
          // Typing must not trigger the game's keyboard shortcuts.
          onKeyDown={(e) => e.stopPropagation()}
          maxLength={CHAT.max}
          placeholder="Message everyone"
          aria-label="Chat message"
          className={cn("min-w-0 flex-1 border-2 px-1.5 py-0.5 text-[11px] outline-none", dark ? "border-white/20 bg-black/30 text-white placeholder:text-white/40" : "border-[#2b2119] bg-white")}
          data-testid="mp-chat-input"
        />
        <button
          type="submit"
          disabled={busy || !text.trim()}
          className={cn("pixel-btn px-2 py-0.5 text-[11px] font-semibold disabled:opacity-50", dark ? "bg-amber-400 text-[#2b2119]" : "bg-emerald-600 text-white")}
          data-testid="mp-chat-send"
        >
          Send
        </button>
      </form>
      {error && <span className={cn("text-[10px]", dark ? "text-red-300" : "text-red-700")}>{error}</span>}
    </div>
  );
}
