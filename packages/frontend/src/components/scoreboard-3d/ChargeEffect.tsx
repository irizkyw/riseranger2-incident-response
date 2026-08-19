import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ChargeEffectProps {
  color: string;
  radius: number;
}

export const ChargeEffect: React.FC<ChargeEffectProps> = ({ color, radius }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const ring3Ref = useRef<THREE.Mesh>(null);
  const coreFlareRef = useRef<THREE.Mesh>(null);
  const shockwaveRef = useRef<THREE.Mesh>(null);
  const lightningRef = useRef<THREE.LineSegments>(null);

  const particleCount = 180;
  const arcSegments = 24;

  // 1. Swarm Particles
  const { positions, scales, velocities } = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const sc = new Float32Array(particleCount);
    const vel = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      const r = radius * (1.8 + Math.random() * 2.6);

      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);

      sc[i] = Math.random() * 0.28 + 0.1;
      vel[i] = 0.94 + Math.random() * 0.04;
    }

    return { positions: pos, scales: sc, velocities: vel };
  }, [radius, particleCount]);

  // 2. Dynamic Electrical Lightning Arc Segments
  const arcPositions = useMemo(() => {
    return new Float32Array(arcSegments * 6); // 2 vertices per segment
  }, [arcSegments]);

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime;

    // 1. Vortex Particles Gravitational Inward Spiral
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * 8;
      pointsRef.current.rotation.z += delta * 5;

      const geom = pointsRef.current.geometry;
      const posAttr = geom.attributes.position;
      for (let i = 0; i < particleCount; i++) {
        let x = posAttr.getX(i);
        let y = posAttr.getY(i);
        let z = posAttr.getZ(i);

        const v = velocities[i];
        x *= v;
        y *= v;
        z *= v;

        const dist = Math.sqrt(x * x + y * y + z * z);
        if (dist < radius * 0.4) {
          // Respawn at outer perimeter
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos((Math.random() * 2) - 1);
          const r = radius * (2.4 + Math.random() * 1.8);
          x = r * Math.sin(phi) * Math.cos(theta);
          y = r * Math.sin(phi) * Math.sin(theta);
          z = r * Math.cos(phi);
        }

        posAttr.setXYZ(i, x, y, z);
      }
      posAttr.needsUpdate = true;
    }

    // 2. Tri-Axis Spinning Gyro Energy Containment Rings
    if (ring1Ref.current) {
      ring1Ref.current.rotation.x += delta * 12;
      ring1Ref.current.rotation.y += delta * 8;
      const pulse1 = 1.0 + Math.sin(time * 22) * 0.18;
      ring1Ref.current.scale.set(pulse1, pulse1, pulse1);
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.y -= delta * 10;
      ring2Ref.current.rotation.z += delta * 14;
      const pulse2 = 1.0 + Math.cos(time * 22) * 0.18;
      ring2Ref.current.scale.set(pulse2, pulse2, pulse2);
    }
    if (ring3Ref.current) {
      ring3Ref.current.rotation.x -= delta * 9;
      ring3Ref.current.rotation.z -= delta * 11;
      const pulse3 = 1.0 + Math.sin(time * 28) * 0.12;
      ring3Ref.current.scale.set(pulse3, pulse3, pulse3);
    }

    // 3. Expanding Concentric Shockwave Pulse
    if (shockwaveRef.current) {
      const swScale = (time * 3.5) % 3.0 + 0.8;
      shockwaveRef.current.scale.set(swScale, swScale, swScale);
      const swMat = shockwaveRef.current.material as THREE.MeshBasicMaterial;
      swMat.opacity = Math.max(0, 0.9 - (swScale / 3.0) * 0.9);
    }

    // 4. Core Overcharge Pulsating Flare
    if (coreFlareRef.current) {
      const corePulse = 1.2 + Math.sin(time * 32) * 0.45;
      coreFlareRef.current.scale.set(corePulse, corePulse, corePulse);
      (coreFlareRef.current.material as THREE.MeshBasicMaterial).opacity = 0.8 + Math.sin(time * 32) * 0.2;
    }

    // 5. Dynamic Lightning Arcs Updates
    if (lightningRef.current) {
      const posAttr = lightningRef.current.geometry.attributes.position;
      for (let i = 0; i < arcSegments; i++) {
        // Inner point on core
        const theta1 = Math.random() * Math.PI * 2;
        const phi1 = Math.acos((Math.random() * 2) - 1);
        const r1 = radius * 0.8;
        const x1 = r1 * Math.sin(phi1) * Math.cos(theta1);
        const y1 = r1 * Math.sin(phi1) * Math.sin(theta1);
        const z1 = r1 * Math.cos(phi1);

        // Outer point on ring / corona
        const theta2 = theta1 + (Math.random() - 0.5) * 0.8;
        const phi2 = phi1 + (Math.random() - 0.5) * 0.8;
        const r2 = radius * (1.8 + Math.random() * 0.8);
        const x2 = r2 * Math.sin(phi2) * Math.cos(theta2);
        const y2 = r2 * Math.sin(phi2) * Math.sin(theta2);
        const z2 = r2 * Math.cos(phi2);

        posAttr.setXYZ(i * 2, x1, y1, z1);
        posAttr.setXYZ(i * 2 + 1, x2, y2, z2);
      }
      posAttr.needsUpdate = true;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* 1. Central Blinding Plasma Flare */}
      <mesh ref={coreFlareRef}>
        <sphereGeometry args={[radius * 1.25, 24, 24]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.9}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 2. Expanding Energy Shockwave Disk */}
      <mesh ref={shockwaveRef} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius * 0.8, radius * 1.0, 32]} />
        <meshBasicMaterial
          color="#FFFFFF"
          transparent
          opacity={0.8}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 3. Tri-Axis Gyro Containment Rings */}
      <mesh ref={ring1Ref}>
        <torusGeometry args={[radius * 2.0, 0.045, 16, 48]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.9}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <mesh ref={ring2Ref}>
        <torusGeometry args={[radius * 2.3, 0.035, 16, 48]} />
        <meshBasicMaterial
          color="#FFFFFF"
          transparent
          opacity={0.95}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <mesh ref={ring3Ref}>
        <torusGeometry args={[radius * 1.7, 0.03, 16, 48]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.85}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 4. Electrical Lightning Arcs */}
      <lineSegments ref={lightningRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[arcPositions, 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial
          color="#FFFFFF"
          transparent
          opacity={0.85}
          blending={THREE.AdditiveBlending}
          linewidth={2}
        />
      </lineSegments>

      {/* 5. Inward Ingathering Plasma Swarm Particles */}
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
          size={0.28}
          transparent
          opacity={0.98}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
    </group>
  );
};
