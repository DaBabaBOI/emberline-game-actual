"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BackSide, Color, DirectionalLight, Fog, Group, HemisphereLight, Mesh, MeshStandardMaterial, PointLight, ShaderMaterial, Vector3 } from "three";
import type { Tile } from "@/game/types";
import { dayClock } from "@/components/civ/hud/time-of-day";
import { realTimeOfDay } from "@/game/calendar";

// ---- The time of day --------------------------------------------------------
// A day is DAY_TICKS game ticks (3 minutes at normal speed), so it pauses with
// the game and speeds up with it. 0 is midnight, 0.25 sunrise, 0.5 noon and
// 0.75 sunset. A new game starts in the golden light just after sunrise.
export const DAY_TICKS = 120;
const DAY_START = 0.27;
const ALWAYS_DAY = 0.42;

// Shared with the water, the clouds and the firelight.
export const daySky = {
  // How dark it is this frame (0 day – 1 night).
  night: 0,
  sunDir: new Vector3(0.5, 0.8, 0.3),
  horizon: new Color("#a8dcf5"),
  sunColor: new Color("#ffffff"),
};

// The look at each moment of the day; the frames in between are blended.
// zenith/horizon: the sky; sun: light colour and strength; hemi: the soft light
// from the sky above and the ground below; stars: 0–1.
interface Look {
  t: number;
  zenith: string;
  horizon: string;
  sun: string;
  sunI: number;
  hemiSky: string;
  hemiGround: string;
  hemiI: number;
  stars: number;
  night: number;
}
const LOOKS: Look[] = [
  { t: 0.0, zenith: "#0a1530", horizon: "#22345e", sun: "#a8bcff", sunI: 0.65, hemiSky: "#5064a0", hemiGround: "#243020", hemiI: 0.8, stars: 1, night: 1 },
  { t: 0.19, zenith: "#0f1d40", horizon: "#30406e", sun: "#a8bcff", sunI: 0.6, hemiSky: "#5366a0", hemiGround: "#243020", hemiI: 0.8, stars: 0.9, night: 1 },
  { t: 0.235, zenith: "#4a6eae", horizon: "#f6b490", sun: "#ffb478", sunI: 1.0, hemiSky: "#e6c8cc", hemiGround: "#5a5c48", hemiI: 0.75, stars: 0.15, night: 0.4 },
  { t: 0.28, zenith: "#62a0dc", horizon: "#ffd2ae", sun: "#ffd09a", sunI: 1.35, hemiSky: "#ffe8d2", hemiGround: "#6f7f4e", hemiI: 0.75, stars: 0, night: 0 },
  { t: 0.36, zenith: "#4f9fe0", horizon: "#c9e8f7", sun: "#fff0dc", sunI: 1.5, hemiSky: "#d6f1ff", hemiGround: "#6f8f4e", hemiI: 0.78, stars: 0, night: 0 },
  { t: 0.5, zenith: "#3f97e0", horizon: "#a8dcf5", sun: "#ffffff", sunI: 1.6, hemiSky: "#d6f1ff", hemiGround: "#6f8f4e", hemiI: 0.8, stars: 0, night: 0 },
  { t: 0.64, zenith: "#4a9ad8", horizon: "#c4e2f0", sun: "#fff2d6", sunI: 1.55, hemiSky: "#e4f1f7", hemiGround: "#6f8f4e", hemiI: 0.78, stars: 0, night: 0 },
  { t: 0.72, zenith: "#5c8ccc", horizon: "#ffcf9c", sun: "#ffcf8c", sunI: 1.5, hemiSky: "#ffe8cc", hemiGround: "#727a4c", hemiI: 0.8, stars: 0, night: 0 },
  { t: 0.765, zenith: "#5a72b4", horizon: "#ffaa6a", sun: "#ffb070", sunI: 1.35, hemiSky: "#ffdcbc", hemiGround: "#685a44", hemiI: 0.8, stars: 0.05, night: 0.15 },
  { t: 0.8, zenith: "#2c3c7a", horizon: "#a06a90", sun: "#b0c0ff", sunI: 0.75, hemiSky: "#7a7aac", hemiGround: "#2c3226", hemiI: 0.78, stars: 0.5, night: 0.7 },
  { t: 0.86, zenith: "#0c1834", horizon: "#283a66", sun: "#a8bcff", sunI: 0.65, hemiSky: "#5064a0", hemiGround: "#243020", hemiI: 0.8, stars: 1, night: 1 },
];
const COLORS = LOOKS.map((l) => ({
  zenith: new Color(l.zenith),
  horizon: new Color(l.horizon),
  sun: new Color(l.sun),
  hemiSky: new Color(l.hemiSky),
  hemiGround: new Color(l.hemiGround),
}));

// Where the sun is: up from 0.22 to 0.78 (a long day, a short night), rising in
// the east and setting in the west. At night the moon lights the land from the
// other side of the sky.
function sunAngles(t: number) {
  const up = t >= 0.22 && t <= 0.78;
  const k = up ? (t - 0.22) / 0.56 : ((t + 1 - 0.78) % 1) / 0.44;
  const elevation = Math.sin(k * Math.PI);
  // East (+x) at rise, west (−x) at set.
  const azimuth = Math.PI * k;
  return { up, elevation, azimuth };
}

// The day's look at time t, blended between the two frames around it.
export interface DayLook {
  zenith: Color;
  horizon: Color;
  sun: Color;
  sunI: number;
  hemiSky: Color;
  hemiGround: Color;
  hemiI: number;
  stars: number;
  night: number;
}
function lookAt(t: number, out: DayLook) {
  let i = LOOKS.length - 1;
  for (let j = 0; j < LOOKS.length; j++) if (LOOKS[j].t <= t) i = j;
  const a = LOOKS[i];
  const bIndex = (i + 1) % LOOKS.length;
  const b = LOOKS[bIndex];
  const span = ((b.t - a.t + 1) % 1) || 1;
  const k = (((t - a.t + 1) % 1) / span) || 0;
  const ca = COLORS[i];
  const cb = COLORS[bIndex];
  out.zenith.copy(ca.zenith).lerp(cb.zenith, k);
  out.horizon.copy(ca.horizon).lerp(cb.horizon, k);
  out.sun.copy(ca.sun).lerp(cb.sun, k);
  out.hemiSky.copy(ca.hemiSky).lerp(cb.hemiSky, k);
  out.hemiGround.copy(ca.hemiGround).lerp(cb.hemiGround, k);
  out.sunI = a.sunI + (b.sunI - a.sunI) * k;
  out.hemiI = a.hemiI + (b.hemiI - a.hemiI) * k;
  out.stars = a.stars + (b.stars - a.stars) * k;
  out.night = a.night + (b.night - a.night) * k;
  return out;
}

const SMOG = new Color("#8f8b80");
const DUST = new Color("#e2cc93");
const STORM = new Color("#5d6873");
const PLAGUE = new Color("#b9b3bf");
// Each era's light has its own warmth (the Stone Age is the coolest and
// clearest; later eras are a touch more golden).
const ERA_WARMTH = [0, 0.12, 0.16, 0.2, 0.1, 0.05];
const WARM = new Color("#ffdcaa");

// Scratch space for this frame's look (only one game is ever on screen).
const LOOK: DayLook = {
  zenith: new Color(),
  horizon: new Color(),
  sun: new Color(),
  sunI: 1,
  hemiSky: new Color(),
  hemiGround: new Color(),
  hemiI: 1,
  stars: 0,
  night: 0,
};

// The sky: a gradient from the horizon up, the sun's disc and glow, the moon,
// and twinkling stars at night.
const SKY_MATERIAL = new ShaderMaterial({
  side: BackSide,
  depthWrite: false,
  fog: false,
  uniforms: {
    zenith: { value: new Color() },
    horizon: { value: new Color() },
    sunDir: { value: new Vector3(0, 1, 0) },
    sunColor: { value: new Color() },
    sunUp: { value: 1 },
    stars: { value: 0 },
    time: { value: 0 },
  },
  vertexShader: /* glsl */ `
    varying vec3 vDir;
    void main() {
      vDir = normalize(position);
      vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      gl_Position = p.xyww;
    }
  `,
  fragmentShader: /* glsl */ `
    uniform vec3 zenith;
    uniform vec3 horizon;
    uniform vec3 sunDir;
    uniform vec3 sunColor;
    uniform float sunUp;
    uniform float stars;
    uniform float time;
    varying vec3 vDir;
    float hash(vec3 p) {
      p = fract(p * 0.3183099 + 0.1);
      p *= 17.0;
      return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
    }
    void main() {
      vec3 dir = normalize(vDir);
      float h = dir.y;
      vec3 col = mix(horizon, zenith, pow(smoothstep(-0.02, 0.65, h), 0.75));
      // Below the horizon the sky fades into the sea haze.
      col = mix(col, horizon * 0.85, smoothstep(0.0, -0.25, h));
      float d = max(dot(dir, normalize(sunDir)), 0.0);
      // The sun (or moon) disc and its glow.
      col += sunColor * (pow(d, 900.0) * 6.0 + pow(d, 60.0) * 0.35 + pow(d, 6.0) * 0.12) * sunUp;
      col += vec3(0.85, 0.9, 1.0) * pow(max(dot(dir, -normalize(sunDir)), 0.0), 1500.0) * 3.0 * stars;
      // Stars, twinkling, only above the horizon.
      vec3 cell = floor(dir * 220.0);
      float s = hash(cell);
      float twinkle = 0.6 + 0.4 * sin(time * 2.0 + s * 40.0);
      col += vec3(step(0.9975, s) * twinkle * stars * smoothstep(0.02, 0.2, h));
      gl_FragColor = vec4(col, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `,
});

// The sky, the sun (or moon), the soft sky light and the fog, all following the
// time of day, plus what the town does to them: wood smoke (`fires`), the
// drought's dust (0–1), a storm (0–1) and the plague's grey.
export function DaySky({
  home,
  tick,
  running,
  msPerTick,
  era,
  fires,
  dust = 0,
  storm = 0,
  plague = false,
  shadowSize,
  alwaysDay = false,
  realClock = false,
}: {
  home: Tile;
  tick: number;
  running: boolean;
  msPerTick: number;
  era: number;
  fires: number;
  dust?: number;
  storm?: number;
  plague?: boolean;
  shadowSize: number;
  alwaysDay?: boolean;
  // Realistic time: the sky follows the player's real clock.
  realClock?: boolean;
}) {
  const sun = useRef<DirectionalLight>(null);
  const hemi = useRef<HemisphereLight>(null);
  const dome = useRef<Mesh>(null);
  // Smooth time between ticks: the last tick, and when it arrived.
  const lastTick = useRef({ tick, at: 0 });

  useFrame(({ scene, camera, clock }) => {
    // The time of day, moving smoothly between ticks (and standing still when
    // the game is paused).
    const now = clock.elapsedTime;
    if (tick !== lastTick.current.tick) lastTick.current = { tick, at: now };
    const frac = running ? Math.min(0.999, (now - lastTick.current.at) / (msPerTick / 1000)) : 0;
    // "Always day" (Menu) holds the sun at late morning.
    const t = alwaysDay
      ? ALWAYS_DAY
      : realClock
        ? (realTimeOfDay(Date.now()) + dayClock.offset) % 1
        : (((tick + frac) / DAY_TICKS + DAY_START + dayClock.offset) % 1 + 1) % 1;
    dayClock.t = t;
    lookAt(t, LOOK);

    // What the town and the weather do to the light.
    const smog = Math.min(0.6, Math.max(0, (fires - 2) / 10));
    const gloom = Math.max(storm * 0.75, plague ? 0.35 : 0);
    LOOK.horizon.lerp(SMOG, smog * 0.8).lerp(DUST, dust * 0.6).lerp(STORM, storm * 0.7);
    LOOK.zenith.lerp(SMOG, smog * 0.5).lerp(DUST, dust * 0.4).lerp(STORM, storm * 0.8);
    if (plague) LOOK.hemiSky.lerp(PLAGUE, 0.6);
    LOOK.sun.lerp(WARM, ERA_WARMTH[era] ?? 0).lerp(DUST, dust * 0.3);
    LOOK.sunI *= 1 - gloom * 0.55;
    LOOK.hemiI *= 1 - gloom * 0.3;
    daySky.night = LOOK.night;
    daySky.horizon.copy(LOOK.horizon);
    daySky.sunColor.copy(LOOK.sun);

    const { up, elevation, azimuth } = sunAngles(t);
    // The light: a high sun at noon, long shadows at dawn and dusk.
    // A little to the south (the camera's side), so the faces we look at are lit.
    // Never quite at the horizon: a grazing light would leave the hex tops dark.
    const height = Math.max(0.3, elevation);
    daySky.sunDir.set(Math.cos(azimuth) * (1 - height * 0.7), height + 0.05, 0.45).normalize();
    if (sun.current) {
      sun.current.position.set(home.x + daySky.sunDir.x * 60, daySky.sunDir.y * 60, home.z + daySky.sunDir.z * 60);
      sun.current.color.copy(LOOK.sun);
      sun.current.intensity = LOOK.sunI;
    }
    if (hemi.current) {
      hemi.current.color.copy(LOOK.hemiSky);
      hemi.current.groundColor.copy(LOOK.hemiGround);
      hemi.current.intensity = LOOK.hemiI;
    }

    // Fog: thicker with smoke, dust and storms, and a little mist at dawn.
    const mist = Math.max(0, 1 - Math.abs(t - 0.25) / 0.06) * 0.5;
    if (!(scene.fog instanceof Fog)) scene.fog = new Fog(LOOK.horizon, 60, 160);
    const fog = scene.fog as Fog;
    const near = 60 - smog * 45 - dust * 20 - storm * 30 - mist * 30;
    const far = 170 - smog * 110 - dust * 40 - storm * 60 - mist * 50;
    fog.near += (near - fog.near) * 0.05;
    fog.far += (far - fog.far) * 0.05;
    fog.color.copy(LOOK.horizon);
    if (scene.background instanceof Color) scene.background.copy(LOOK.horizon);

    // The sky dome rides with the camera, so it is always the far backdrop.
    if (dome.current) dome.current.position.copy(camera.position);
    const u = SKY_MATERIAL.uniforms;
    (u.zenith.value as Color).copy(LOOK.zenith);
    (u.horizon.value as Color).copy(LOOK.horizon);
    (u.sunColor.value as Color).copy(LOOK.sun);
    // The moon is drawn opposite the sun (sunDir is the light's direction at
    // night, so flip it for the disc).
    (u.sunDir.value as Vector3).copy(daySky.sunDir).multiplyScalar(up ? 1 : -1);
    u.sunUp.value = up ? Math.min(1, elevation * 4) * (1 - gloom) : 0;
    u.stars.value = LOOK.stars * (1 - gloom) * (1 - smog);
    u.time.value = now;
  });

  return (
    <>
      <mesh ref={dome} material={SKY_MATERIAL} renderOrder={-1} frustumCulled={false} raycast={() => null}>
        <sphereGeometry args={[320, 32, 16]} />
      </mesh>
      <hemisphereLight ref={hemi} />
      <directionalLight
        ref={sun}
        castShadow
        shadow-mapSize={[shadowSize, shadowSize]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-60}
        shadow-camera-right={60}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
        shadow-camera-far={160}
      >
        <object3D attach="target" position={[home.x, 0, home.z]} />
      </directionalLight>
    </>
  );
}

// ---- Firelight at night ------------------------------------------------------
// A fixed set of lights (adding or removing lights makes every material
// rebuild, a visible stutter), handed to the burning fires nearest home. They
// glow warm at dusk and night and flicker; by day they are off.
const FIRE_LIGHTS = 6;

export function FireLights({ fires, home }: { fires: Tile[]; home: Tile }) {
  const lights = useRef<(PointLight | null)[]>([]);
  const nearest = useMemo(
    () =>
      [...fires]
        .sort((a, b) => Math.hypot(a.x - home.x, a.z - home.z) - Math.hypot(b.x - home.x, b.z - home.z))
        .slice(0, FIRE_LIGHTS),
    [fires, home],
  );
  useFrame(({ clock }) => {
    const glow = Math.max(0, (daySky.night - 0.15) / 0.85);
    lights.current.forEach((l, i) => {
      if (!l) return;
      const f = nearest[i];
      if (!f) {
        l.intensity = 0;
        return;
      }
      l.position.set(f.x, f.height + 0.9, f.z);
      const flicker = 0.85 + Math.sin(clock.elapsedTime * 9 + i * 1.7) * 0.08 + Math.sin(clock.elapsedTime * 23 + i) * 0.05;
      l.intensity = glow * 6 * flicker;
    });
  });
  return (
    <>
      {Array.from({ length: FIRE_LIGHTS }, (_, i) => (
        <pointLight
          key={i}
          ref={(el) => {
            lights.current[i] = el;
          }}
          color="#ff9442"
          intensity={0}
          distance={7}
          decay={1.6}
        />
      ))}
    </>
  );
}

// ---- Clouds -------------------------------------------------------------------
// Puffy clouds drifting high over the islands, their shadows sliding across the
// land. When the camera is up among them they turn invisible but keep casting
// their shadows, so they never block the view. Lit by the time of day: gold at
// sunset, grey-blue at night, dark in a storm.
const CLOUDS = 9;
const CLOUD_HEIGHT = 32;
const WHITE = new Color("#ffffff");
const NIGHT_CLOUD = new Color("#3a4466");
const STORM_CLOUD = new Color("#59606b");

function cloudRandom(i: number, salt: number) {
  const x = Math.sin(i * 91.7 + salt * 47.3) * 43758.5453;
  return x - Math.floor(x);
}

const CLOUD_MATERIAL = new MeshStandardMaterial({ color: "#ffffff", roughness: 1, flatShading: true, transparent: true, opacity: 0.92 });
// Where each cloud is (they drift; only one game is ever on screen).
const CLOUD_STATE = Array.from({ length: CLOUDS }, (_, i) => ({
  x: (cloudRandom(i, 1) - 0.5) * 140,
  z: (cloudRandom(i, 2) - 0.5) * 120,
  y: CLOUD_HEIGHT + cloudRandom(i, 3) * 8,
  speed: 0.6 + cloudRandom(i, 4) * 0.5,
  puffs: Array.from({ length: 4 + Math.floor(cloudRandom(i, 5) * 3) }, (_, j) => ({
    x: (cloudRandom(i * 7 + j, 6) - 0.5) * 7,
    y: cloudRandom(i * 7 + j, 7) * 1.2,
    z: (cloudRandom(i * 7 + j, 8) - 0.5) * 3.5,
    s: 1.8 + cloudRandom(i * 7 + j, 9) * 1.8,
  })),
}));

export function Clouds({ home, storm = 0 }: { home: Tile; storm?: number }) {
  const group = useRef<Group>(null);
  const clouds = CLOUD_STATE;
  useFrame(({ camera }, delta) => {
    const g = group.current;
    if (!g) return;
    const dt = Math.min(delta, 0.1);
    g.children.forEach((c, i) => {
      const cloud = clouds[i];
      cloud.x += cloud.speed * dt * (1 + storm * 2);
      if (cloud.x > 75) cloud.x = -75;
      c.position.set(home.x + cloud.x, cloud.y, home.z + cloud.z);
    });
    CLOUD_MATERIAL.color.copy(WHITE).lerp(daySky.sunColor, 0.35).lerp(NIGHT_CLOUD, daySky.night * 0.85).lerp(STORM_CLOUD, storm * 0.8);
    // Up in the clouds: shadows only.
    CLOUD_MATERIAL.colorWrite = camera.position.y < CLOUD_HEIGHT - 6;
    CLOUD_MATERIAL.depthWrite = CLOUD_MATERIAL.colorWrite;
  });
  return (
    <group ref={group}>
      {clouds.map((c, i) => (
        <group key={i}>
          {c.puffs.map((p, j) => (
            <mesh key={j} position={[p.x, p.y, p.z]} scale={[p.s, p.s * 0.55, p.s]} material={CLOUD_MATERIAL} castShadow raycast={() => null}>
              <icosahedronGeometry args={[1, 1]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}
