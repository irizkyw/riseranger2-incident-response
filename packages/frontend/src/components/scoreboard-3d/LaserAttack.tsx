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

  // Muzzle offset in front of the drone so laser emerges cleanly from the nose cannons
  const muzzleOffset = 0.9;

  const { startVec, muzzleOrigin, direction, totalDistance, effectiveDistance, quaternion } = useMemo(() => {
    const s = new THREE.Vector3(...startPos);
    const e = new THREE.Vector3(...endPos);
    const dir = new THREE.Vector3().subVectors(e, s);
    const dist = dir.length();
    dir.normalize();

    const muzzle = s.clone().add(dir.clone().multiplyScalar(muzzleOffset));
    const effDist = Math.max(0.1, dist - muzzleOffset);

    // Default cylinder geometry points along Y axis (0, 1, 0)
    const up = new THREE.Vector3(0, 1, 0);
    const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);

    return {
      startVec: s,
      muzzleOrigin: muzzle,
      direction: dir,
      totalDistance: dist,
      effectiveDistance: effDist,
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
  const baseLaserLength = isLarge ? totalDistance * 0.55 : totalDistance * 0.32;
  const speed = isLarge ? totalDistance * 1.45 : totalDistance * 2.1;

  useFrame((state, delta) => {
    if (!meshRef.current || !glowRef.current) return;

    progressRef.current += speed * delta;
    const currentDist = progressRef.current;

    // Trigger impact when the leading tip reaches the Sun corona / surface
    if (currentDist >= effectiveDistance - 0.5) {
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

    // Emerging beam calculation: Tail never extends behind muzzleOrigin (front of drone)
    const headDist = Math.min(effectiveDistance, currentDist);
    const tailDist = Math.max(0, currentDist - baseLaserLength);
    const visibleLength = Math.max(0.01, headDist - tailDist);
    const centerDist = (headDist + tailDist) * 0.5;

    const centerPos = muzzleOrigin.clone().add(direction.clone().multiplyScalar(centerDist));
    const headPos = muzzleOrigin.clone().add(direction.clone().multiplyScalar(headDist));

    const lengthScale = visibleLength / baseLaserLength;

    meshRef.current.position.copy(centerPos);
    meshRef.current.quaternion.copy(quaternion);
    meshRef.current.scale.set(1, lengthScale, 1);

    glowRef.current.position.copy(centerPos);
    glowRef.current.quaternion.copy(quaternion);
    glowRef.current.scale.set(1, lengthScale, 1);

    // Leading tip plasma flare
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
        <cylinderGeometry args={[radius * 0.7, radius * 0.9, baseLaserLength, isLarge ? 16 : 10]} />
        <meshBasicMaterial color="#FFFFFF" />
      </mesh>

      {/* 2. Outer Volumetric Energy Glow Tube */}
      <mesh ref={glowRef}>
        <cylinderGeometry args={[radius * 3.2, radius * 3.8, baseLaserLength, isLarge ? 16 : 10]} />
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
