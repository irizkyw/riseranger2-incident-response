import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ShieldDeflectProps {
  position?: [number, number, number];
  color?: string;
  onComplete?: () => void;
}

export const ShieldDeflect: React.FC<ShieldDeflectProps> = ({
  position = [0, 0, 0],
  color = '#EF4444',
  onComplete
}) => {
  const shieldDomeRef = useRef<THREE.Mesh>(null);
  const rippleRingRef = useRef<THREE.Mesh>(null);
  const sparkPointsRef = useRef<THREE.Points>(null);

  const startTimeRef = useRef<number | null>(null);
  const duration = 0.75; // 0.75 seconds forcefield deflection flash
  const sparkCount = 60;

  const { positions, velocities } = useMemo(() => {
    const pos = new Float32Array(sparkCount * 3);
    const vel = new Float32Array(sparkCount * 3);

    for (let i = 0; i < sparkCount; i++) {
      pos[i * 3] = position[0];
      pos[i * 3 + 1] = position[1];
      pos[i * 3 + 2] = position[2];

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      const speed = 2.5 + Math.random() * 5;

      vel[i * 3] = speed * Math.sin(phi) * Math.cos(theta);
      vel[i * 3 + 1] = speed * Math.sin(phi) * Math.sin(theta);
      vel[i * 3 + 2] = speed * Math.cos(phi);
    }

    return { positions: pos, velocities: vel };
  }, [position, sparkCount]);

  useFrame((state, delta) => {
    if (startTimeRef.current === null) {
      startTimeRef.current = state.clock.elapsedTime;
    }

    const elapsed = state.clock.elapsedTime - startTimeRef.current;
    if (elapsed >= duration) {
      if (onComplete) onComplete();
      return;
    }

    const progress = elapsed / duration;

    // 1. Hexagonal / Geodesic Forcefield Shield Dome Flash
    if (shieldDomeRef.current) {
      const scale = 3.2 + Math.sin(progress * Math.PI) * 0.4;
      shieldDomeRef.current.scale.set(scale, scale, scale);
      const mat = shieldDomeRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, (1 - progress) * 0.9);
    }

    // 2. Shield Deflection Ripple Wave Ring
    if (rippleRingRef.current) {
      const ringScale = 2.8 + progress * 6.5;
      rippleRingRef.current.scale.set(ringScale, ringScale, ringScale);
      const mat = rippleRingRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, (1 - progress) * 0.8);
    }

    // 3. Ricochet Fizzle Sparks
    if (sparkPointsRef.current) {
      const geom = sparkPointsRef.current.geometry;
      const posAttr = geom.attributes.position;
      for (let i = 0; i < sparkCount; i++) {
        velocities[i * 3] *= 0.94;
        velocities[i * 3 + 1] *= 0.94;
        velocities[i * 3 + 2] *= 0.94;

        posAttr.setXYZ(
          i,
          posAttr.getX(i) + velocities[i * 3] * delta,
          posAttr.getY(i) + velocities[i * 3 + 1] * delta,
          posAttr.getZ(i) + velocities[i * 3 + 2] * delta
        );
      }
      posAttr.needsUpdate = true;

      const mat = sparkPointsRef.current.material as THREE.PointsMaterial;
      mat.opacity = Math.max(0, 1 - progress);
    }
  });

  return (
    <group position={position}>
      {/* 1. Hexagonal Shimmering Forcefield Barrier Dome */}
      <mesh ref={shieldDomeRef}>
        <icosahedronGeometry args={[1, 3]} />
        <meshBasicMaterial
          color={color}
          wireframe
          transparent
          opacity={0.85}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 2. Expanding Energy Ripple Deflect Ring */}
      <mesh ref={rippleRingRef} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.9, 1.05, 36]} />
        <meshBasicMaterial
          color="#00F0FF"
          transparent
          opacity={0.8}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 3. Deflection Ricochet Sparks */}
      <points ref={sparkPointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[positions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          color="#00F0FF"
          size={0.22}
          transparent
          opacity={0.9}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
    </group>
  );
};
