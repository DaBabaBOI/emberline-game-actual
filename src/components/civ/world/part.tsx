import type { ReactNode } from "react";

export interface PartProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number] | number;
  color: string;
  opacity: number;
  metalness?: number;
  roughness?: number;
  emissive?: string;
  emissiveIntensity?: number;
  children: ReactNode;
}

// One primitive mesh (box/cylinder/cone/etc.) with a consistent material.
// `opacity` < 1 is how buildings get their translucent "preview" look before
// they're actually placed.
export function Part({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  color,
  opacity,
  metalness = 0.1,
  roughness = 0.7,
  emissive,
  emissiveIntensity,
  children,
}: PartProps) {
  return (
    <mesh
      position={position}
      rotation={rotation}
      scale={scale}
      castShadow={opacity >= 1}
      receiveShadow={opacity >= 1}
    >
      {children}
      <meshStandardMaterial
        color={color}
        transparent={opacity < 1}
        opacity={opacity}
        metalness={metalness}
        roughness={roughness}
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
        depthWrite={opacity >= 1}
      />
    </mesh>
  );
}
