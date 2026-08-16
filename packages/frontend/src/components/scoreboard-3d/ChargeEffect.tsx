import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ChargeEffectProps {
  color: string;
  radius: number;
}

export const ChargeEffect: React.FC<ChargeEffectProps> = ({ color, radius }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const particleCount = 30;

  const { positions, scales } = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const sc = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      // Random spherical distribution around planet
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      const r = radius * (1.5 + Math.random() * 1.5);

      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);

      sc[i] = Math.random() * 0.15 + 0.05;
    }

    return { positions: pos, scales: sc };
  }, [radius, particleCount]);

  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    pointsRef.current.rotation.y += delta * 4;
    pointsRef.current.rotation.z += delta * 2;

    // Spiral particles inward
    const geom = pointsRef.current.geometry;
    const posAttr = geom.attributes.position;
    for (let i = 0; i < particleCount; i++) {
      let x = posAttr.getX(i);
      let y = posAttr.getY(i);
      let z = posAttr.getZ(i);

      x *= 0.96;
      y *= 0.96;
      z *= 0.96;

      const dist = Math.sqrt(x * x + y * y + z * z);
      if (dist < radius * 0.8) {
        // Reset particle to outer shell
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos((Math.random() * 2) - 1);
        const r = radius * 2.5;
        x = r * Math.sin(phi) * Math.cos(theta);
        y = r * Math.sin(phi) * Math.sin(theta);
        z = r * Math.cos(phi);
      }

      posAttr.setXYZ(i, x, y, z);
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-scale"
          args={[scales, 1]}
        />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={0.18}
        transparent
        opacity={0.9}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
};
