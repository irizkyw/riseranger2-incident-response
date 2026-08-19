import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface LaserAttackProps {
  startPos: [number, number, number];
  endPos: [number, number, number];
  color: string;
  isFirstBlood: boolean;
  success?: boolean;
  onImpact?: () => void;
}

export const LaserAttack: React.FC<LaserAttackProps> = ({ startPos, endPos, color, isFirstBlood, success = true, onImpact }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const headFlareRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const progressRef = useRef(0);
  const hasImpactedRef = useRef(false);

  const { startVec, endVec, direction, totalDistance, quaternion } = useMemo(() => {
    const s = new THREE.Vector3(...startPos);
    const e = new THREE.Vector3(...endPos);
    const dir = new THREE.Vector3().subVectors(e, s);
    const dist = dir.length();
    dir.normalize();

    // Default cylinder points along Y axis (0, 1, 0)
    const up = new THREE.Vector3(0, 1, 0);
    const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);

    return {
      startVec: s,
      endVec: e,
      direction: dir,
      totalDistance: dist,
      quaternion: quat
    };
  }, [startPos, endPos]);

  const onImpactRef = useRef(onImpact);
  onImpactRef.current = onImpact;

  useEffect(() => {
    progressRef.current = 0;
    hasImpactedRef.current = false;
  }, [startPos, endPos]);

  // Successful hits are large continuous beams (~0.85s); miss burst shots are swift (~0.5s)
  const isLarge = success || isFirstBlood;
  const laserLength = isLarge ? totalDistance * 0.65 : totalDistance * 0.38;
  const speed = isLarge ? totalDistance * 1.35 : totalDistance * 1.95;

  useFrame((state, delta) => {
    if (!meshRef.current || !glowRef.current) return;

    progressRef.current += speed * delta;
    const currentDist = progressRef.current;

    // Trigger impact when the leading tip reaches the Sun corona / surface
    if (currentDist >= totalDistance - 0.9) {
      if (!hasImpactedRef.current) {
        hasImpactedRef.current = true;
        if (onImpactRef.current) onImpactRef.current();
      }
      meshRef.current.visible = false;
      glowRef.current.visible = false;
      if (headFlareRef.current) headFlareRef.current.visible = false;
      if (ringRef.current) ringRef.current.visible = false;
      return;
    }

    // Position laser so leading tip emerges directly from planet towards the sun
    const headDist = currentDist;
    const centerDist = Math.max(laserLength * 0.5, headDist);
    const centerPos = startVec.clone().add(direction.clone().multiplyScalar(centerDist - laserLength * 0.5));
    const headPos = startVec.clone().add(direction.clone().multiplyScalar(headDist));

    meshRef.current.position.copy(centerPos);
    meshRef.current.quaternion.copy(quaternion);

    glowRef.current.position.copy(centerPos);
    glowRef.current.quaternion.copy(quaternion);

    // Leading tip of the plasma bolt
    if (headFlareRef.current) {
      headFlareRef.current.position.copy(headPos);
      const pulse = 1.0 + Math.sin(state.clock.elapsedTime * 30) * 0.25;
      headFlareRef.current.scale.set(pulse, pulse, pulse);
    }

    // First Blood rotating containment ring
    if (ringRef.current) {
      ringRef.current.position.copy(centerPos);
      ringRef.current.quaternion.copy(quaternion);
      ringRef.current.rotation.y += delta * 12;
    }
  });

  const laserColor = isFirstBlood ? '#FFD700' : color;
  const radius = isFirstBlood ? 0.32 : (success ? 0.22 : 0.08);

  return (
    <group>
      {/* 1. Core Blinding Plasma Laser Beam */}
      <mesh ref={meshRef}>
        <cylinderGeometry args={[radius * 0.7, radius * 0.9, laserLength, isLarge ? 16 : 10]} />
        <meshBasicMaterial color="#FFFFFF" />
      </mesh>

      {/* 2. Outer Volumetric Energy Glow Tube */}
      <mesh ref={glowRef}>
        <cylinderGeometry args={[radius * 3.2, radius * 3.8, laserLength * 1.15, isLarge ? 16 : 10]} />
        <meshBasicMaterial
          color={laserColor}
          transparent
          opacity={isLarge ? 0.92 : 0.85}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 3. Blinding Front Plasma Head Flare */}
      <mesh ref={headFlareRef}>
        <sphereGeometry args={[radius * 3.8, 16, 16]} />
        <meshBasicMaterial
          color={isFirstBlood ? '#FFF700' : '#FFFFFF'}
          transparent
          opacity={0.98}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 4. Colossal Rotating Containment Torus for First Blood */}
      {isFirstBlood && (
        <mesh ref={ringRef}>
          <torusGeometry args={[radius * 4.2, 0.06, 12, 32]} />
          <meshBasicMaterial
            color="#FFD700"
            transparent
            opacity={0.8}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}
    </group>
  );
};
