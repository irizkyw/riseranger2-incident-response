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

  // Create procedural soft glowing round snowflake texture
  const frostTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Soft radial glow
      const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
      gradient.addColorStop(0.3, 'rgba(186, 230, 253, 0.9)');
      gradient.addColorStop(0.6, 'rgba(56, 189, 248, 0.35)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(32, 32, 32, 0, Math.PI * 2);
      ctx.fill();

      // Delicate 6-arm crystal core
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.lineWidth = 1.5;
      for (let a = 0; a < 3; a++) {
        ctx.save();
        ctx.translate(32, 32);
        ctx.rotate((a * Math.PI) / 3);
        ctx.beginPath();
        ctx.moveTo(0, -16);
        ctx.lineTo(0, 16);
        ctx.stroke();
        ctx.restore();
      }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);

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
        size={0.85}
        map={frostTexture}
        color="#BAE6FD"
        transparent
        opacity={0.9}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        alphaTest={0.01}
      />
    </points>
  );
};
