"use client";

import { useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { hexDistance } from "@/game/hex";
import type { Tile } from "@/game/types";
import { Figures, type Agent } from "./figures";
import { makeGround } from "./ground";

type Kind = "deer" | "boar";

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

function Deer() {
  return (
    <group>
      <mesh castShadow position={[0, 0.2, 0]}>
        <boxGeometry args={[0.12, 0.12, 0.28]} />
        <meshStandardMaterial color="#9c6a3c" />
      </mesh>
      <mesh castShadow position={[0, 0.3, 0.13]} rotation={[0.6, 0, 0]}>
        <cylinderGeometry args={[0.03, 0.04, 0.14, 6]} />
        <meshStandardMaterial color="#9c6a3c" />
      </mesh>
      <mesh castShadow position={[0, 0.37, 0.19]}>
        <boxGeometry args={[0.07, 0.07, 0.11]} />
        <meshStandardMaterial color="#8a5c33" />
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
        <mesh key={i} castShadow position={[x, 0.08, z]}>
          <cylinderGeometry args={[0.012, 0.01, 0.16, 5]} />
          <meshStandardMaterial color="#6b4a2b" />
        </mesh>
      ))}
      <mesh position={[0, 0.24, -0.15]}>
        <sphereGeometry args={[0.025, 6, 5]} />
        <meshStandardMaterial color="#f4efe6" />
      </mesh>
    </group>
  );
}

function Boar() {
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
        <mesh key={i} position={[x, 0.04, z]}>
          <cylinderGeometry args={[0.014, 0.012, 0.08, 5]} />
          <meshStandardMaterial color="#2b211a" />
        </mesh>
      ))}
    </group>
  );
}

function AnimalView({ animal, motion }: { animal: Animal; motion: React.RefObject<Map<number, Motion>> }) {
  const ref = useRef<Group>(null);
  useFrame(({ clock }) => {
    const g = ref.current;
    const m = motion.current?.get(animal.id);
    if (!g || !m) return;
    g.position.set(m.x, animal.home.height, m.z);
    g.rotation.y = m.heading;
    if (m.downAt !== null) {
      const t = Math.min(1, (clock.elapsedTime - m.downAt) / 0.6);
      g.rotation.z = (Math.PI / 2) * t;
    } else {
      g.rotation.z = 0;
    }
  });
  return <group ref={ref}>{animal.kind === "deer" ? <Deer /> : <Boar />}</group>;
}

// Deer and boar roam the forests. Every so often a hunter walks out from the
// village, brings one down, and returns with food.
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
  const hunt = useRef<{ target: number; phase: "out" | "back"; nextAt: number }>({ target: -1, phase: "out", nextAt: 15 });

  useFrame(({ clock }, delta) => {
    const now = clock.elapsedTime;
    const dt = Math.min(delta, 0.1);

    if (animals.length < wanted && forests.length && Math.random() < 0.02) {
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
      setAnimals((list) => [...list, { id, kind: Math.random() < 0.65 ? "deer" : "boar", home }]);
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
        if (prey) {
          h.target = prey.id;
          h.phase = "out";
          hunter.current = [
            {
              x: homeTile.x,
              y: homeTile.height,
              z: homeTile.z,
              heading: 0,
              moving: true,
              scale: 1.4,
              tunic: "#556b2f",
              skin: "#c68642",
              hair: "#2b1b10",
              phase: 0,
            },
          ];
        } else {
          h.nextAt = now + 10;
        }
      }
      return;
    }

    const man = hunter.current[0];
    const preyInfo = animals.find((a) => a.id === h.target);
    const prey = preyInfo ? motion.current.get(preyInfo.id) : undefined;
    if (!man || !preyInfo || !prey) {
      h.target = -1;
      h.nextAt = now + 20;
      return;
    }
    const goal = h.phase === "out" ? prey : { x: homeTile.x, z: homeTile.z };
    const dx = goal.x - man.x;
    const dz = goal.z - man.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.25) {
      if (h.phase === "out") {
        prey.downAt = now;
        h.phase = "back";
        onHunt(preyInfo.kind);
        setTimeout(() => {
          motion.current.delete(preyInfo.id);
          setAnimals((list) => list.filter((a) => a.id !== preyInfo.id));
        }, 4000);
      } else {
        h.target = -1;
        h.nextAt = now + 25 + Math.random() * 20;
      }
      return;
    }
    const s = Math.min(d, 0.9 * dt);
    man.x += (dx / d) * s;
    man.z += (dz / d) * s;
    man.heading = Math.atan2(dx, dz);
    const under = ground.tileAt(man.x, man.z);
    man.y += (ground.heightAt(man.x, man.z) + (under?.terrain === "mountain" ? 0.55 : 0) - man.y) * Math.min(1, dt * 12);
  });

  return (
    <group>
      {animals.map((a) => (
        <AnimalView key={a.id} animal={a} motion={motion} />
      ))}
      <Figures agents={hunter} max={1} weapon="spear" />
    </group>
  );
}
