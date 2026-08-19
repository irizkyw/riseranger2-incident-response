import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ImpactBurstProps {
  position: [number, number, number];
  color?: string;
  isFirstBlood?: boolean;
  onComplete?: () => void;
}

export const ImpactBurst: React.FC<ImpactBurstProps> = ({
  position,
  color = '#FFCC00',
  isFirstBlood = false,
  onComplete
}) => {
  const pointsRef = useRef<THREE.Points>(null);
  const fireballRef = useRef<THREE.Mesh>(null);
  const fireballCoreRef = useRef<THREE.Mesh>(null);
  const shockwave1Ref = useRef<THREE.Mesh>(null);
  const shockwave2Ref = useRef<THREE.Mesh>(null);
  const shockwave3Ref = useRef<THREE.Mesh>(null);

  const startTimeRef = useRef<number | null>(null);
  // Extended long-lasting majestic explosion duration (3.0s normal, 4.0s First Blood)
  const duration = isFirstBlood ? 4.0 : 3.0;
  const particleCount = isFirstBlood ? 400 : 300;

  const { positions, velocities, colors } = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const vel = new Float32Array(particleCount * 3);
    const col = new Float32Array(particleCount * 3);

    const baseColor = new THREE.Color(color);
    const whiteColor = new THREE.Color('#FFFFFF');
    const fireColor = new THREE.Color(isFirstBlood ? '#FFA500' : '#FF3300');
    const amberColor = new THREE.Color('#FFD700');

    for (let i = 0; i < particleCount; i++) {
      pos[i * 3] = position[0];
      pos[i * 3 + 1] = position[1];
      pos[i * 3 + 2] = position[2];

      // Radial spherical burst outward
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      const speed = isFirstBlood ? 4 + Math.random() * 16 : 3 + Math.random() * 12;

      vel[i * 3] = speed * Math.sin(phi) * Math.cos(theta);
      vel[i * 3 + 1] = speed * Math.sin(phi) * Math.sin(theta) + 1.2;
      vel[i * 3 + 2] = speed * Math.cos(phi);

      const blended = i % 4 === 0 ? whiteColor : (i % 3 === 0 ? baseColor : (i % 2 === 0 ? fireColor : amberColor));
      col[i * 3] = blended.r;
      col[i * 3 + 1] = blended.g;
      col[i * 3 + 2] = blended.b;
    }

    return { positions: pos, velocities: vel, colors: col };
  }, [position, color, isFirstBlood, particleCount]);

  useEffect(() => {
    startTimeRef.current = null;
  }, [position]);

  useFrame((state, delta) => {
    if (startTimeRef.current === null) {
      startTimeRef.current = state.clock.elapsedTime;
    }

    const elapsed = state.clock.elapsedTime - startTimeRef.current;
    if (elapsed >= duration) {
      if (onComplete) onComplete();
      return;
    }

    const progress = elapsed / duration; // 0.0 -> 1.0

    // 1. Giant Expanding Solar Fireball Outer Plasma Shell
    if (fireballRef.current) {
      const scale = 1.2 + Math.pow(progress, 0.7) * (isFirstBlood ? 16.0 : 12.0);
      fireballRef.current.scale.set(scale, scale, scale);
      const mat = fireballRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, (1 - Math.pow(progress, 1.2)) * 0.95);
    }

    // 1b. Blinding White/Gold Fireball Core
    if (fireballCoreRef.current) {
      const coreScale = 0.8 + Math.pow(progress, 0.5) * (isFirstBlood ? 9.0 : 6.5);
      fireballCoreRef.current.scale.set(coreScale, coreScale, coreScale);
      const mat = fireballCoreRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, (1 - Math.pow(progress, 1.5)) * 0.98);
    }

    // 2. Triple Concentric Shockwave Blast Rings
    if (shockwave1Ref.current) {
      const ringScale = 0.5 + progress * (isFirstBlood ? 24.0 : 18.0);
      shockwave1Ref.current.scale.set(ringScale, ringScale, ringScale);
      (shockwave1Ref.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, (1 - progress) * 0.9);
    }
    if (shockwave2Ref.current) {
      const ringScale = 0.2 + progress * (isFirstBlood ? 20.0 : 15.0);
      shockwave2Ref.current.scale.set(ringScale, ringScale, ringScale);
      (shockwave2Ref.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, (1 - progress) * 0.8);
    }
    if (shockwave3Ref.current) {
      const ringScale = 0.8 + progress * (isFirstBlood ? 16.0 : 12.0);
      shockwave3Ref.current.scale.set(ringScale, ringScale, ringScale);
      (shockwave3Ref.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, (1 - progress) * 0.75);
    }

    // 3. Shrapnel & Lingering Plasma Sparkles
    if (pointsRef.current) {
      const geom = pointsRef.current.geometry;
      const posAttr = geom.attributes.position;
      for (let i = 0; i < particleCount; i++) {
        const vx = velocities[i * 3];
        const vy = velocities[i * 3 + 1];
        const vz = velocities[i * 3 + 2];

        // Smooth physics drag
        velocities[i * 3] *= 0.985;
        velocities[i * 3 + 1] *= 0.985;
        velocities[i * 3 + 2] *= 0.985;

        posAttr.setXYZ(
          i,
          posAttr.getX(i) + vx * delta,
          posAttr.getY(i) + vy * delta,
          posAttr.getZ(i) + vz * delta
        );
      }
      posAttr.needsUpdate = true;

      const mat = pointsRef.current.material as THREE.PointsMaterial;
      mat.opacity = Math.max(0, (1 - Math.pow(progress, 1.4)));
      mat.size = Math.max(0.08, 0.65 * (1 - progress * 0.7));
    }
  });

  return (
    <group position={position}>
      {/* 1. Giant Expanding Outer Plasma Fireball */}
      <mesh ref={fireballRef}>
        <sphereGeometry args={[1.2, 28, 28]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.95}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 1b. Blinding Inner Core Sphere */}
      <mesh ref={fireballCoreRef}>
        <sphereGeometry args={[0.8, 20, 20]} />
        <meshBasicMaterial
          color="#FFFFFF"
          transparent
          opacity={0.98}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 2. Triple Concentric Shockwave Blast Rings */}
      <mesh ref={shockwave1Ref} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.9, 1.15, 48]} />
        <meshBasicMaterial
          color="#FFFFFF"
          transparent
          opacity={0.95}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <mesh ref={shockwave2Ref} rotation={[0, Math.PI / 2, 0]}>
        <ringGeometry args={[0.8, 1.05, 48]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.85}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <mesh ref={shockwave3Ref} rotation={[Math.PI / 4, Math.PI / 4, 0]}>
        <ringGeometry args={[0.7, 0.95, 48]} />
        <meshBasicMaterial
          color={isFirstBlood ? '#FFD700' : '#FF4500'}
          transparent
          opacity={0.8}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 3. Plasma Explosion Particles */}
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[positions, 3]}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[colors, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.45}
          vertexColors
          transparent
          opacity={1.0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
    </group>
  );
};
