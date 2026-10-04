"use client";

import { useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { hexDistance } from "@/game/hex";
import type { Tile } from "@/game/types";
import { Figures, type Agent } from "./figures";
import { makeGround } from "./ground";
import { grabStore, type Walker } from "./villagers";
import { goldenDeer } from "@/components/civ/hud/eggs";
import { GOLDEN_DEER_CHANCE } from "@/game/easter";

// A golden deer turns up very rarely (an easter egg: a feast when hunted).
type Kind = "deer" | "boar" | "golden";

interface Animal {
  id: number;
  kind: Kind;
  home: Tile;
}

interface Motion {
  x: number;
  z: number;
  tx: number;
  tz: number;
  heading: number;
  wait: number;
  downAt: number | null;
}

// Legs hang from a pivot at the hip so they can swing while walking.
type Legs = React.RefObject<(Group | null)[]>;

function Deer({ legs, gold = false }: { legs: Legs; gold?: boolean }) {
  // The golden deer shines a little (the bloom makes it glow).
  const coat = (c: string) => (gold ? { color: "#f2c14e", emissive: "#b8860b", emissiveIntensity: 0.6, metalness: 0.4, roughness: 0.35 } : { color: c });
  return (
    <group>
      <mesh castShadow position={[0, 0.2, 0]}>
        <boxGeometry args={[0.12, 0.12, 0.28]} />
        <meshStandardMaterial {...coat("#9c6a3c")} />
      </mesh>
      <mesh castShadow position={[0, 0.3, 0.13]} rotation={[0.6, 0, 0]}>
        <cylinderGeometry args={[0.03, 0.04, 0.14, 6]} />
        <meshStandardMaterial {...coat("#9c6a3c")} />
      </mesh>
      <mesh castShadow position={[0, 0.37, 0.19]}>
        <boxGeometry args={[0.07, 0.07, 0.11]} />
        <meshStandardMaterial {...coat("#8a5c33")} />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[0.03 * s, 0.45, 0.17]} rotation={[0, 0, 0.5 * s]}>
            <cylinderGeometry args={[0.006, 0.006, 0.12, 4]} />
            <meshStandardMaterial color="#e8dcc0" />
          </mesh>
          <mesh position={[0.07 * s, 0.49, 0.17]} rotation={[0.5, 0, 0.9 * s]}>
            <cylinderGeometry args={[0.005, 0.005, 0.07, 4]} />
            <meshStandardMaterial color="#e8dcc0" />
          </mesh>
        </group>
      ))}
      {[[-0.04, 0.1], [0.04, 0.1], [-0.04, -0.1], [0.04, -0.1]].map(([x, z], i) => (
        <group key={i} position={[x, 0.16, z]} ref={(el) => void (legs.current[i] = el)}>
          <mesh castShadow position={[0, -0.08, 0]}>
            <cylinderGeometry args={[0.012, 0.01, 0.16, 5]} />
            <meshStandardMaterial {...coat("#6b4a2b")} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.24, -0.15]}>
        <sphereGeometry args={[0.025, 6, 5]} />
        <meshStandardMaterial color="#f4efe6" />
      </mesh>
    </group>
  );
}

function Boar({ legs }: { legs: Legs }) {
  return (
    <group>
      <mesh castShadow position={[0, 0.13, 0]} scale={[1, 0.85, 1.5]}>
        <sphereGeometry args={[0.1, 10, 8]} />
        <meshStandardMaterial color="#4a3a2e" flatShading />
      </mesh>
      <mesh castShadow position={[0, 0.12, 0.17]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.035, 0.05, 0.08, 7]} />
        <meshStandardMaterial color="#3d2f25" />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0.035 * s, 0.1, 0.2]} rotation={[-0.8, 0, 0.3 * s]}>
          <coneGeometry args={[0.01, 0.05, 5]} />
          <meshStandardMaterial color="#f4efe6" />
        </mesh>
      ))}
      {[[-0.05, 0.08], [0.05, 0.08], [-0.05, -0.08], [0.05, -0.08]].map(([x, z], i) => (
        <group key={i} position={[x, 0.08, z]} ref={(el) => void (legs.current[i] = el)}>
          <mesh position={[0, -0.04, 0]}>
            <cylinderGeometry args={[0.014, 0.012, 0.08, 5]} />
            <meshStandardMaterial color="#2b211a" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function AnimalView({ animal, motion }: { animal: Animal; motion: React.RefObject<Map<number, Motion>> }) {
  const ref = useRef<Group>(null);
  const legs = useRef<(Group | null)[]>([]);
  const last = useRef({ x: 0, z: 0, step: 0 });
  useFrame(({ clock }, delta) => {
    const g = ref.current;
    const m = motion.current?.get(animal.id);
    if (!g || !m) return;
    // Walking: legs swing in diagonal pairs and the body bobs, only while moving.
    const moved = Math.hypot(m.x - last.current.x, m.z - last.current.z);
    last.current.x = m.x;
    last.current.z = m.z;
    const walking = m.downAt === null && moved > 0.0005 && moved < 0.5;
    if (walking) last.current.step += Math.min(delta, 0.1) * (animal.kind === "boar" ? 14 : 11);
    const swing = walking ? Math.sin(last.current.step) * 0.55 : 0;
    legs.current.forEach((leg, i) => {
      if (leg) leg.rotation.x = i === 0 || i === 3 ? swing : -swing;
    });
    g.position.set(m.x, animal.home.height + (walking ? Math.abs(Math.sin(last.current.step)) * 0.012 : 0), m.z);
    g.rotation.y = m.heading;
    if (m.downAt !== null) {
      const t = Math.min(1, (clock.elapsedTime - m.downAt) / 0.6);
      g.rotation.z = (Math.PI / 2) * t;
    } else {
      g.rotation.z = 0;
    }
  });
  return <group ref={ref}>{animal.kind === "boar" ? <Boar legs={legs} /> : <Deer legs={legs} gold={animal.kind === "golden"} />}</group>;
}

// Who goes hunting: a grown-up who is well, free (not working, carried or out
// already) and on the map. Whoever is closest to a gatherer's camp, if there
// are any; otherwise anyone free.
function pickHunter(camps: Tile[]): Walker | null {
  const free = grabStore.walkers.filter(
    (w) => !w.child && !w.held && !w.goneUntil && !w.hunting && !w.workAt && w.tunic === (w.baseTunic ?? w.tunic),
  );
  if (!free.length) return null;
  if (!camps.length) return free[Math.floor(Math.random() * free.length)];
  const near = (w: Walker) => Math.min(...camps.map((c) => Math.hypot(c.x - w.x, c.z - w.z)));
  return free.reduce((a, b) => (near(a) <= near(b) ? a : b));
}

// Deer and boar roam the forests. Every so often one of the villagers goes
// hunting (someone at a gatherer's camp if there is one, otherwise someone with
// nothing to do), brings an animal down, and walks back with the food to where
// they set out from. They are one of the tribe the whole time: they never
// appear from or vanish into the fire.
export function Wildlife({
  tiles,
  homeTile,
  onHunt,
}: {
  tiles: Tile[];
  homeTile: Tile;
  onHunt: (animal: string) => void;
}) {
  const forests = useMemo(
    () => tiles.filter((t) => t.revealed && t.terrain === "forest" && !t.building && t.growth >= 0.8),
    [tiles],
  );
  const wanted = Math.min(14, Math.floor(forests.length / 4));
  const ground = useMemo(() => makeGround(tiles), [tiles]);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const nextId = useRef(0);
  const motion = useRef(new Map<number, Motion>());
  const hunter = useRef<Agent[]>([]);
  const hunt = useRef<{
    target: number;
    phase: "out" | "back";
    nextAt: number;
    // The villager out hunting, and where they set out from.
    who: Walker | null;
    from: { x: number; z: number };
  }>({ target: -1, phase: "out", nextAt: 15, who: null, from: { x: 0, z: 0 } });
  const camps = useMemo(() => tiles.filter((t) => t.building === "gatherer"), [tiles]);

  useFrame(({ clock }, delta) => {
    const now = clock.elapsedTime;
    const dt = Math.min(delta, 0.1);

    // The dev panel can call up the golden deer at once.
    if ((animals.length < wanted || goldenDeer.wanted) && forests.length && (goldenDeer.wanted || Math.random() < 0.02)) {
      const home = forests[Math.floor(Math.random() * forests.length)];
      const id = nextId.current++;
      motion.current.set(id, {
        x: home.x,
        z: home.z,
        tx: home.x,
        tz: home.z,
        heading: Math.random() * 6,
        wait: Math.random() * 3,
        downAt: null,
      });
      const golden = goldenDeer.wanted || Math.random() < GOLDEN_DEER_CHANCE;
      goldenDeer.wanted = false;
      setAnimals((list) => [...list, { id, kind: golden ? "golden" : Math.random() < 0.65 ? "deer" : "boar", home }]);
    }

    for (const animal of animals) {
      const a = motion.current.get(animal.id);
      if (!a || a.downAt !== null) continue;
      const dx = a.tx - a.x;
      const dz = a.tz - a.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.03) {
        a.wait -= dt;
        if (a.wait <= 0) {
          a.tx = animal.home.x + (Math.random() - 0.5) * 1.2;
          a.tz = animal.home.z + (Math.random() - 0.5) * 1.2;
          a.wait = 2 + Math.random() * 4;
        }
      } else {
        const s = Math.min(d, 0.25 * dt);
        a.x += (dx / d) * s;
        a.z += (dz / d) * s;
        a.heading = Math.atan2(dx, dz);
      }
    }

    const h = hunt.current;
    if (h.target < 0) {
      hunter.current = [];
      if (now > h.nextAt) {
        const prey = animals
          .filter((a) => motion.current.get(a.id)?.downAt === null && hexDistance(a.home, homeTile) <= 8)
          .sort((a, b) => hexDistance(a.home, homeTile) - hexDistance(b.home, homeTile))[0];
        const who = prey ? pickHunter(camps) : null;
        if (prey && who) {
          h.target = prey.id;
          h.phase = "out";
          h.who = who;
          h.from = { x: who.x, z: who.z };
          who.hunting = true;
          hunter.current = [
            {
              x: who.x,
              y: who.y,
              z: who.z,
              heading: who.heading,
              moving: true,
              scale: who.scale,
              tunic: who.tunic,
              skin: who.skin,
              hair: who.hair,
              phase: who.phase,
              crown: who.crown,
            },
          ];
        } else {
          h.nextAt = now + 10;
        }
      }
      return;
    }

    const man = hunter.current[0];
    if (!man) {
      h.target = -1;
      h.nextAt = now + 20;
      return;
    }
    // Hand the villager back, standing where the hunter is.
    const done = () => {
      const w = h.who;
      if (w) Object.assign(w, { x: man.x, z: man.z, y: man.y, tx: man.x, tz: man.z, heading: man.heading, wait: 2, hunting: false });
      h.who = null;
      h.target = -1;
      hunter.current = [];
    };
    if (!h.who) {
      done();
      h.nextAt = now + 20;
      return;
    }
    const preyInfo = animals.find((a) => a.id === h.target);
    const prey = preyInfo ? motion.current.get(preyInfo.id) : undefined;
    // The walk back never depends on the prey: it is cleared away a few seconds
    // after the kill. If the prey is gone before they reach it, they just head back.
    if (h.phase === "out" && (!preyInfo || !prey || prey.downAt !== null)) h.phase = "back";
    const goal = h.phase === "out" && prey ? prey : h.from;
    const dx = goal.x - man.x;
    const dz = goal.z - man.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.25) {
      if (h.phase === "out" && prey && preyInfo) {
        prey.downAt = now;
        h.phase = "back";
        onHunt(preyInfo.kind === "golden" ? "golden deer" : preyInfo.kind);
        setTimeout(() => {
          motion.current.delete(preyInfo.id);
          setAnimals((list) => list.filter((a) => a.id !== preyInfo.id));
        }, 4000);
      } else {
        done();
        h.nextAt = now + 25 + Math.random() * 20;
      }
      return;
    }
    // Straight there if the way is clear; otherwise veer a little either side
    // (round a building, a fire or the water) until it is.
    const s = Math.min(d, 0.9 * dt);
    const aim = Math.atan2(dx, dz);
    const clear = (a: number) => ground.walkable(man.x + Math.sin(a) * 0.3, man.z + Math.cos(a) * 0.3);
    const heading = d < 0.6 || !ground.walkable(man.x, man.z) ? aim : [0, 0.5, -0.5, 1, -1, 1.5, -1.5, 2.2, -2.2].map((k) => aim + k).find(clear) ?? aim;
    man.x += Math.sin(heading) * s;
    man.z += Math.cos(heading) * s;
    man.heading = heading;
    const under = ground.tileAt(man.x, man.z);
    man.y += (ground.heightAt(man.x, man.z) + (under?.terrain === "mountain" ? 0.55 : 0) - man.y) * Math.min(1, dt * 12);
  });

  return (
    <group>
      {animals.map((a) => (
        <AnimalView key={a.id} animal={a} motion={motion} />
      ))}
      <Figures agents={hunter} max={1} weapon="spear" group="people" />
    </group>
  );
}
