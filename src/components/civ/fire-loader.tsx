"use client";

import { useEffect, useState } from "react";

// While the game loads: a campfire in the dark. Logs, three tongues of flame
// that flicker out of step, a glow that breathes, embers drifting up and a
// little smoke. All CSS (globals.css, .fire-*), so it shows at once.

// Where each ember starts, how far it drifts and how long it takes (the same
// every time, so the server and browser draw it alike).
const EMBERS = Array.from({ length: 14 }, (_, i) => {
  const r = (n: number) => {
    const x = Math.sin((i + 1) * n * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  };
  return { left: 38 + r(1) * 24, drift: (r(2) - 0.5) * 60, delay: r(3) * 2.6, dur: 1.8 + r(4) * 1.6, size: 2 + Math.round(r(5) * 2) };
});

export function FireLoader({ text = "Lighting the fire", fading = false }: { text?: string; fading?: boolean }) {
  return (
    <div className={"fire-loader" + (fading ? " fire-loader-out" : "")} data-testid="fire-loader" role="status" aria-label={text}>
      <div className="fire-stage">
        <div className="fire-glow" />
        {[0, 1, 2].map((i) => (
          <div key={i} className={`fire-smoke fire-smoke-${i}`} />
        ))}
        {EMBERS.map((e, i) => (
          <span
            key={i}
            className="fire-ember"
            style={{ left: `${e.left}%`, width: e.size, height: e.size, animationDelay: `${e.delay}s`, animationDuration: `${e.dur}s`, ["--drift" as string]: `${e.drift}px` }}
          />
        ))}
        <div className="fire-flame fire-flame-back" />
        <div className="fire-flame fire-flame-left" />
        <div className="fire-flame fire-flame-right" />
        <div className="fire-flame fire-flame-core" />
        <div className="fire-log fire-log-a" />
        <div className="fire-log fire-log-b" />
        <div className="fire-stones">
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} />
          ))}
        </div>
      </div>
      <p className="font-pixel fire-text">
        {text}
        <span className="talk-dots" />
      </p>
    </div>
  );
}

// Over the world until its first frame is drawn (world-canvas sends
// "emberline-world-ready"), then it fades out. Gives up after a while anyway.
export function WorldLoader() {
  const [phase, setPhase] = useState<"on" | "fading" | "gone">("on");
  useEffect(() => {
    let done = false;
    const fade = () => {
      if (done) return;
      done = true;
      setPhase("fading");
      setTimeout(() => setPhase("gone"), 700);
    };
    window.addEventListener("emberline-world-ready", fade);
    const giveUp = setTimeout(fade, 15000);
    return () => {
      window.removeEventListener("emberline-world-ready", fade);
      clearTimeout(giveUp);
    };
  }, []);
  if (phase === "gone") return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-[80]">
      <FireLoader text="Waking the island" fading={phase === "fading"} />
    </div>
  );
}
