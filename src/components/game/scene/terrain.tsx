export function Terrain({ radius = 5.2 }: { radius?: number }) {
  return (
    <group>
      <mesh position={[0, -0.6, 0]} receiveShadow>
        <cylinderGeometry args={[radius + 3, radius + 3.4, 0.4, 48]} />
        <meshStandardMaterial color="#2f7fb3" roughness={0.4} metalness={0.1} />
      </mesh>

      <mesh position={[0, -0.25, 0]} receiveShadow>
        <cylinderGeometry args={[radius * 0.92, radius, 0.5, 48]} />
        <meshStandardMaterial color="#e3c98a" roughness={0.9} />
      </mesh>

      <mesh position={[0, 0.02, 0]} receiveShadow>
        <cylinderGeometry args={[radius * 0.8, radius * 0.9, 0.35, 48]} />
        <meshStandardMaterial color="#6cbf6b" roughness={0.85} />
      </mesh>
    </group>
  );
}
