import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface FrostParticlesProps {
  count?: number;
}

export const FrostParticles: React.FC<FrostParticlesProps> = ({ count = 600 }) => {
  const pointsRef = useRef<THREE.Points>(null);

  // Generate randomized positions, speeds, and sizes for floating ice crystals
  const [positions, velocities, sizes] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    const sz = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      // Spread across 3D arena
      pos[idx] = (Math.random() - 0.5) * 80;
      pos[idx + 1] = (Math.random() - 0.5) * 50;
      pos[idx + 2] = (Math.random() - 0.5) * 80;

      // Slow drifting motion
      vel[idx] = (Math.random() - 0.5) * 0.04;
      vel[idx + 1] = -0.02 - Math.random() * 0.05; // Gently falling / drifting down
      vel[idx + 2] = (Math.random() - 0.5) * 0.04;

      sz[i] = Math.random() * 2.5 + 0.8;
    }

    return [pos, vel, sz];
  }, [count]);

  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    const geo = pointsRef.current.geometry;
    const posAttr = geo.attributes.position as THREE.BufferAttribute;
    const currentPositions = posAttr.array as Float32Array;

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      currentPositions[idx] += velocities[idx] * (delta * 30);
      currentPositions[idx + 1] += velocities[idx + 1] * (delta * 30);
      currentPositions[idx + 2] += velocities[idx + 2] * (delta * 30);

      // Wrap around bounds
      if (currentPositions[idx + 1] < -25) {
        currentPositions[idx + 1] = 25;
        currentPositions[idx] = (Math.random() - 0.5) * 80;
        currentPositions[idx + 2] = (Math.random() - 0.5) * 80;
      }
    }

    posAttr.needsUpdate = true;
    pointsRef.current.rotation.y += delta * 0.015;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={sizes.length}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.6}
        color="#7DD3FC"
        transparent
        opacity={0.85}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
};
