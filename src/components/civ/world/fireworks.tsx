"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, DataTexture, Points, PointsMaterial } from "three";
import type { Tile } from "@/game/types";
import { playSfx } from "@/lib/audio";

// The Konami code's fireworks: rockets climb over the village and burst into
// glowing sparks that fall and fade (the film look's bloom makes them shine).
const SHOW_SECONDS = 9;
const ROCKETS = 14;
const SPARKS = 64;
const COLORS = ["#ff5a5a", "#ffd23f", "#5ad1ff", "#9b6bff", "#5aff8a", "#ff8ad8", "#ffffff"];

interface Rocket {
  launch: number; // seconds into the show
  x: number;
  z: number;
  height: number;
  color: Color;
  burst: boolean;
  dirs: { x: number; y: number; z: number }[];
}

function makeShow(): Rocket[] {
  return Array.from({ length: ROCKETS }, (_, i) => ({
    launch: i * 0.55 + Math.random() * 0.4,
    x: (Math.random() - 0.5) * 9,
    z: (Math.random() - 0.5) * 7,
    height: 7 + Math.random() * 4,
    color: new Color(COLORS[i % COLORS.length]).multiplyScalar(3.5),
    burst: false,
    dirs: Array.from({ length: SPARKS }, () => {
      // Evenly round a sphere, at a random speed.
      const u = Math.random() * 2 - 1;
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(1 - u * u);
      const speed = 2.2 + Math.random() * 1.2;
      return { x: r * Math.cos(a) * speed, y: u * speed, z: r * Math.sin(a) * speed };
    }),
  }));
}

// A soft round glow for each spark (points are square without it).
function makeDot() {
  const size = 32;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - size / 2 + 0.5, y - size / 2 + 0.5) / (size / 2);
      const a = Math.max(0, 1 - d) ** 1.8;
      data.set([255, 255, 255, Math.round(a * 255)], (y * size + x) * 4);
    }
  }
  const tex = new DataTexture(data, size, size);
  tex.needsUpdate = true;
  return tex;
}

// `startedAt` is performance.now() when the show began (0: none yet).
export function Fireworks({ home, startedAt }: { home: Tile; startedAt: number }) {
  const points = useRef<Points>(null);
  const show = useRef<{ at: number; rockets: Rocket[] } | null>(null);
  const count = ROCKETS * (SPARKS + 1);
  const geometry = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(new Float32Array(count * 3), 3));
    g.setAttribute("color", new BufferAttribute(new Float32Array(count * 3), 3));
    return g;
  }, [count]);
  const material = useMemo(
    () => new PointsMaterial({ size: 0.95, map: makeDot(), vertexColors: true, transparent: true, depthWrite: false, blending: AdditiveBlending, toneMapped: false }),
    [],
  );

  useFrame(() => {
    const p = points.current;
    if (!p) return;
    if (startedAt && (!show.current || show.current.at !== startedAt)) show.current = { at: startedAt, rockets: makeShow() };
    const s = show.current;
    const t = s ? (performance.now() - s.at) / 1000 : Infinity;
    p.visible = t < SHOW_SECONDS + 3;
    if (!s || !p.visible) return;
    const pos = p.geometry.getAttribute("position") as BufferAttribute;
    const col = p.geometry.getAttribute("color") as BufferAttribute;
    let i = 0;
    for (const r of s.rockets) {
      const age = t - r.launch;
      const climb = 1.1;
      // The rocket going up: a bright point (hidden before launch and after the burst).
      if (age > 0 && age < climb) {
        const k = age / climb;
        pos.setXYZ(i, home.x + r.x, 1 + r.height * (1 - (1 - k) * (1 - k)), home.z + r.z);
        col.setXYZ(i, 2, 1.8, 1.4);
      } else {
        pos.setXYZ(i, 0, -50, 0);
      }
      i++;
      if (age >= climb && !r.burst) {
        r.burst = true;
        playSfx("firework");
      }
      // The sparks: out from the burst, falling, fading over 3 s.
      const since = age - climb;
      const fade = since > 0 ? Math.max(0, 1 - since / 3) : 0;
      for (const d of r.dirs) {
        if (fade > 0) {
          pos.setXYZ(i, home.x + r.x + d.x * since, 1 + r.height + d.y * since - 1.1 * since * since, home.z + r.z + d.z * since);
          col.setXYZ(i, r.color.r * fade, r.color.g * fade, r.color.b * fade);
        } else {
          pos.setXYZ(i, 0, -50, 0);
        }
        i++;
      }
    }
    pos.needsUpdate = true;
    col.needsUpdate = true;
  });

  return <points ref={points} geometry={geometry} material={material} frustumCulled={false} visible={false} raycast={() => null} />;
}
