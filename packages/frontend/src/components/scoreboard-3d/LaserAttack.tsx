import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface LaserAttackProps {
  startPos: [number, number, number];
  endPos: [number, number, number];
  color: string;
  isFirstBlood: boolean;
  onImpact?: () => void;
}

export const LaserAttack: React.FC<LaserAttackProps> = ({ startPos, endPos, color, isFirstBlood, onImpact }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const progressRef = useRef(0);
  const hasImpactedRef = useRef(false);

  const { startVec, endVec, direction, totalDistance, quaternion } = useMemo(() => {
    const s = new THREE.Vector3(...startPos);
    const e = new THREE.Vector3(...endPos);
    const dir = new THREE.Vector3().subVectors(e, s);
    const dist = dir.length();
    dir.normalize();

    // Default cylinder points along Y axis (0, 1, 0)
    // Calculate rotation quaternion from (0, 1, 0) to direction vector
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

  useEffect(() => {
    progressRef.current = 0;
    hasImpactedRef.current = false;
  }, [startPos, endPos]);

  const laserLength = totalDistance * 0.45; // Laser bolt is 45% of total distance
  const speed = totalDistance * 3.0; // Travels total distance in ~0.33s

  useFrame((_, delta) => {
    if (!meshRef.current || !glowRef.current) return;

    progressRef.current += speed * delta;
    const currentDist = progressRef.current;

    if (currentDist >= totalDistance) {
      if (!hasImpactedRef.current) {
        hasImpactedRef.current = true;
        if (onImpact) onImpact();
      }
      // Hide mesh after impact
      meshRef.current.visible = false;
      glowRef.current.visible = false;
      return;
    }

    // Position laser center along trajectory
    const pos = startVec.clone().add(direction.clone().multiplyScalar(currentDist));
    meshRef.current.position.copy(pos);
    meshRef.current.quaternion.copy(quaternion);

    glowRef.current.position.copy(pos);
    glowRef.current.quaternion.copy(quaternion);
  });

  const laserColor = isFirstBlood ? '#FFD700' : color;
  const radius = isFirstBlood ? 0.08 : 0.05;

  return (
    <group>
      {/* Core Laser Bolt */}
      <mesh ref={meshRef}>
        <cylinderGeometry args={[radius, radius, laserLength, 8]} />
        <meshBasicMaterial color="#FFFFFF" />
      </mesh>

      {/* Outer Glow Bolt */}
      <mesh ref={glowRef}>
        <cylinderGeometry args={[radius * 2.5, radius * 2.5, laserLength * 1.1, 8]} />
        <meshBasicMaterial
          color={laserColor}
          transparent
          opacity={0.7}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
};
