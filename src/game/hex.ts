export const HEX_RADIUS = 1;
const SQRT3 = Math.sqrt(3);

// Pointy-top axial layout: the hex points face ±z, which matches how
// three.js orients a 6-sided CylinderGeometry.
export function axialToWorld(q: number, r: number): [number, number] {
  return [HEX_RADIUS * SQRT3 * (q + r / 2), HEX_RADIUS * 1.5 * r];
}

export function hexDistance(
  a: { q: number; r: number },
  b: { q: number; r: number },
) {
  const dq = a.q - b.q;
  const dr = a.r - b.r;
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
}

export const NEIGHBOR_OFFSETS: [number, number][] = [
  [1, 0],
  [1, -1],
  [0, -1],
  [-1, 0],
  [-1, 1],
  [0, 1],
];

export const hexKey = (q: number, r: number) => `${q},${r}`;
