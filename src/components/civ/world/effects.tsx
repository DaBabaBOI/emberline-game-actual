"use client";

import { Bloom, BrightnessContrast, EffectComposer, HueSaturation, N8AO, ToneMapping, Vignette } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";

// The film look ("fancy" graphics only): soft shadows where things meet (N8AO),
// a glow round fires, flames, the sun and the stars (bloom picks out only what
// is brighter than white), each era's own colour grade, darker corners
// (vignette), then the film-style tone curve. Grading by era: the Stone Age is
// earthy and muted, the Ancient era warm, the Classical bright and clean, the
// Medieval deep and rich, then cooler and crisper towards the future.
const GRADE = [
  { saturation: 0.02, contrast: 0.05, hue: 0.0 },
  { saturation: 0.1, contrast: 0.06, hue: 0.01 },
  { saturation: 0.12, contrast: 0.04, hue: 0.0 },
  { saturation: 0.14, contrast: 0.09, hue: -0.01 },
  { saturation: 0.04, contrast: 0.08, hue: -0.02 },
  { saturation: 0.08, contrast: 0.07, hue: -0.03 },
];

export function FilmLook({ era, cinematic }: { era: number; cinematic: boolean }) {
  const grade = GRADE[era] ?? GRADE[0];
  return (
    <EffectComposer multisampling={4}>
      <N8AO aoRadius={1.4} intensity={2.2} distanceFalloff={0.6} quality="medium" halfRes />
      <Bloom mipmapBlur intensity={0.75} luminanceThreshold={0.9} luminanceSmoothing={0.25} radius={0.7} />
      <HueSaturation saturation={grade.saturation} hue={grade.hue} />
      <BrightnessContrast contrast={grade.contrast} />
      {/* During a camera shot the corners darken further, like a film. */}
      <Vignette offset={cinematic ? 0.2 : 0.32} darkness={cinematic ? 0.75 : 0.5} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  );
}
