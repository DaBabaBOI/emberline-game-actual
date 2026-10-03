"use client";

import { useFrame } from "@react-three/fiber";
import { Color, MeshStandardMaterial } from "three";
import type { Tile } from "@/game/types";
import { daySky } from "./sky";

// Sea level: above the sea-floor tiles (deep 0.12, shallow 0.2), below the
// beaches (0.34), so the shallows show through lighter than the deep water.
export const SEA_LEVEL = 0.24;

const DEEP = new Color("#1d74b0");
const NIGHT_SEA = new Color("#0e2a4a");

const SEA_UNIFORMS = { uTime: { value: 0 }, uSky: { value: new Color("#a8dcf5") } };

// The sea's surface (only one game is ever on screen).
function makeSea() {
  const m = new MeshStandardMaterial({ color: DEEP, transparent: true, opacity: 0.8, roughness: 0.12, metalness: 0.05 });
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, SEA_UNIFORMS);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vSeaPos;")
      .replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvSeaPos = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        varying vec3 vSeaPos;
        uniform float uTime;
        uniform vec3 uSky;
        // The slope of a few waves rolling different ways, at different sizes.
        vec2 waveSlope(vec2 p, float t) {
          vec2 g = vec2(0.0);
          vec2 d1 = normalize(vec2(0.8, 0.6)); float f1 = 1.3; g += d1 * f1 * 0.05 * cos(dot(p, d1) * f1 + t * 1.1);
          vec2 d2 = normalize(vec2(-0.4, 0.9)); float f2 = 2.7; g += d2 * f2 * 0.025 * cos(dot(p, d2) * f2 + t * 1.7);
          vec2 d3 = normalize(vec2(0.95, -0.3)); float f3 = 5.1; g += d3 * f3 * 0.012 * cos(dot(p, d3) * f3 + t * 2.3);
          vec2 d4 = normalize(vec2(-0.7, -0.7)); float f4 = 9.3; g += d4 * f4 * 0.006 * cos(dot(p, d4) * f4 + t * 3.1);
          return g;
        }`,
      )
      .replace(
        "#include <normal_fragment_maps>",
        `#include <normal_fragment_maps>
        vec2 slope = waveSlope(vSeaPos.xz, uTime);
        normal = normalize((viewMatrix * vec4(normalize(vec3(-slope.x, 1.0, -slope.y)), 0.0)).xyz);`,
      )
      .replace(
        "#include <opaque_fragment>",
        `#include <opaque_fragment>
        // Looking across the water (a low angle), it mirrors the sky.
        float fres = pow(1.0 - clamp(dot(normalize(vViewPosition), normal), 0.0, 1.0), 4.0);
        gl_FragColor.rgb = mix(gl_FragColor.rgb, uSky, fres * 0.55);
        gl_FragColor.a = mix(gl_FragColor.a, 1.0, fres * 0.6);`,
      );
  };
  return m;
}
const SEA = makeSea();

// The sea: a see-through surface with small waves rolling across it, catching
// the sun (a glittering path at sunrise and sunset) and the sky's colour at a
// low angle. The waves are drawn by bending the surface's light, not its shape,
// so it costs almost nothing.
export function Sea({ home }: { home: Tile }) {
  useFrame(({ clock }) => {
    SEA_UNIFORMS.uTime.value = clock.elapsedTime;
    SEA_UNIFORMS.uSky.value.copy(daySky.horizon);
    SEA.color.copy(DEEP).lerp(NIGHT_SEA, daySky.night * 0.7);
  });

  return (
    <group position={[home.x, 0, home.z]}>
      {/* The sea floor far from land, so open water reads deep blue. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} raycast={() => null}>
        <planeGeometry args={[700, 700]} />
        <meshStandardMaterial color="#0f3f66" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, SEA_LEVEL, 0]} material={SEA} receiveShadow raycast={() => null}>
        <planeGeometry args={[700, 700]} />
      </mesh>
    </group>
  );
}
