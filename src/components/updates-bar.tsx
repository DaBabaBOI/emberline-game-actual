"use client";

import { useState } from "react";
import { UPDATES } from "@/game/updates";

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// A thin "what's new" strip for the top of a page. Shows the latest update's
// first line; open it to see every change.
export function UpdatesBar() {
  const [open, setOpen] = useState(false);
  const latest = UPDATES[0];
  if (!latest) return null;
  return (
    <div className="border-b-4 border-[#2b2119] bg-amber-100 text-[#2b2119]" data-testid="updates-bar">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-sm">
        <span className="font-pixel shrink-0 bg-[#2b2119] px-2 py-0.5 text-xs text-amber-100">Update</span>
        <span className="font-pixel shrink-0 text-xs text-amber-800">{formatDate(latest.date)}</span>
        <span className="order-last min-w-0 basis-full sm:order-none sm:basis-0 sm:flex-1">{latest.items[0]}</span>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="pixel-btn font-pixel ml-auto shrink-0 bg-[#fdf6e3] px-2 py-0.5 text-xs sm:ml-0"
          aria-expanded={open}
        >
          {open ? "Hide" : "What's new"}
        </button>
      </div>
      {open && (
        <div className="mx-auto max-w-5xl px-4 pb-3 text-left text-sm">
          {UPDATES.map((u) => (
            <div key={u.date} className="mt-2">
              <p className="font-pixel text-xs text-amber-800">{formatDate(u.date)}</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                {u.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
