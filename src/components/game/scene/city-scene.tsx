"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Terrain } from "./terrain";
import { BUILDING_COMPONENTS } from "./buildings";
import { MAX_TURNS } from "@/lib/game";

const COLS = 5;
const ROWS = 3;
const SPACING = 1.65;

function slotPosition(index: number): [number, number, number] {
  const col = index % COLS;
  const row = Math.floor(index / COLS);
  const x = (col - (COLS - 1) / 2) * SPACING;
  const z = (row - (ROWS - 1) / 2) * SPACING;
  return [x, 0.2, z];
}

function EmptyMarker({ position }: { position: [number, number, number] }) {
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.42, 0.48, 24]} />
      <meshStandardMaterial
        color="#ffffff"
        transparent
        opacity={0.35}
        depthWrite={false}
      />
    </mesh>
  );
}

export interface CitySceneProps {
  builds: string[];
  previewActionId?: string | null;
}

export function CityScene({ builds, previewActionId }: CitySceneProps) {
  const nextEmptyIndex = builds.length < MAX_TURNS ? builds.length : -1;

  return (
    <div className="h-[420px] w-full overflow-hidden rounded-3xl bg-gradient-to-b from-sky-300 to-sky-100 dark:from-sky-950 dark:to-sky-900">
      <Canvas
        shadows
        orthographic
        camera={{ position: [9, 8, 9], zoom: 55, near: 0.1, far: 100 }}
      >
        <color attach="background" args={["#bfe8fb"]} />
        <ambientLight intensity={0.7} />
        <hemisphereLight args={["#bfe8fb", "#6cbf6b", 0.5]} />
        <directionalLight
          position={[6, 10, 4]}
          intensity={1.2}
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-camera-left={-8}
          shadow-camera-right={8}
          shadow-camera-top={8}
          shadow-camera-bottom={-8}
        />

        <Suspense fallback={null}>
          <Terrain />

          {Array.from({ length: MAX_TURNS }, (_, i) => {
            const buildId = builds[i];
            const Component = buildId ? BUILDING_COMPONENTS[buildId] : null;
            const position = slotPosition(i);

            if (Component) {
              return (
                <group key={i} position={position}>
                  <Component opacity={1} />
                </group>
              );
            }

            if (i === nextEmptyIndex && previewActionId) {
              const Preview = BUILDING_COMPONENTS[previewActionId];
              if (Preview) {
                return (
                  <group key={i} position={position}>
                    <Preview opacity={0.4} />
                  </group>
                );
              }
            }

            return <EmptyMarker key={i} position={position} />;
          })}
        </Suspense>

        <OrbitControls
          enablePan={false}
          minPolarAngle={0.6}
          maxPolarAngle={1.1}
          minZoom={30}
          maxZoom={110}
        />
      </Canvas>
    </div>
  );
}
