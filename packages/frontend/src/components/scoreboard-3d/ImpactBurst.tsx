import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ImpactBurstProps {
  position: [number, number, number];
  color?: string;
  onComplete?: () => void;
}

export const ImpactBurst: React.FC<ImpactBurstProps> = ({ position, color = '#FFCC00', onComplete }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const startTimeRef = useRef<number | null>(null);
  const duration = 1.2; // 1.2 seconds burst
  const particleCount = 45;

  const { positions, velocities } = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const vel = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      pos[i * 3] = position[0];
      pos[i * 3 + 1] = position[1];
      pos[i * 3 + 2] = position[2];

      // Radial burst outward with slight upward bias
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      const speed = 3 + Math.random() * 6;

      vel[i * 3] = speed * Math.sin(phi) * Math.cos(theta);
      vel[i * 3 + 1] = speed * Math.sin(phi) * Math.sin(theta) + 1.5; // upward boost
      vel[i * 3 + 2] = speed * Math.cos(phi);
    }

    return { positions: pos, velocities: vel };
  }, [position, particleCount]);

  useEffect(() => {
    startTimeRef.current = null;
  }, [position]);

  useFrame((state, delta) => {
    if (!pointsRef.current) return;
    if (startTimeRef.current === null) {
      startTimeRef.current = state.clock.elapsedTime;
    }

    const elapsed = state.clock.elapsedTime - startTimeRef.current;
    if (elapsed >= duration) {
      if (onComplete) onComplete();
      return;
    }

    // Expand positions
    const geom = pointsRef.current.geometry;
    const posAttr = geom.attributes.position;
    for (let i = 0; i < particleCount; i++) {
      const vx = velocities[i * 3];
      const vy = velocities[i * 3 + 1];
      const vz = velocities[i * 3 + 2];

      posAttr.setXYZ(
        i,
        posAttr.getX(i) + vx * delta,
        posAttr.getY(i) + vy * delta,
        posAttr.getZ(i) + vz * delta
      );
    }
    posAttr.needsUpdate = true;

    // Fade opacity and shrink particles over time
    const mat = pointsRef.current.material as THREE.PointsMaterial;
    mat.opacity = Math.max(0, 1 - (elapsed / duration));
    mat.size = Math.max(0.02, 0.3 * (1 - (elapsed / duration)));
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={0.3}
        transparent
        opacity={1.0}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
};
