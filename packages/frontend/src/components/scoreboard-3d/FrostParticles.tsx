import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface FrostParticlesProps {
  isFrozen: boolean;
  count?: number;
}

export const FrostParticles: React.FC<FrostParticlesProps> = ({ isFrozen, count = 200 }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const opacityRef = useRef(isFrozen ? 0.85 : 0);

  // Generate randomized positions and sizes for floating ice crystals once
  const [positions, sizes] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const sz = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      pos[idx] = (Math.random() - 0.5) * 80;
      pos[idx + 1] = (Math.random() - 0.5) * 50;
      pos[idx + 2] = (Math.random() - 0.5) * 80;
      sz[i] = Math.random() * 2.0 + 0.8;
    }

    return [pos, sz];
  }, [count]);

  // Create procedural soft glowing snowflake texture once
  const frostTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
      gradient.addColorStop(0.3, 'rgba(186, 230, 253, 0.9)');
      gradient.addColorStop(0.6, 'rgba(56, 189, 248, 0.35)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(32, 32, 32, 0, Math.PI * 2);
      ctx.fill();

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
    return texture;
  }, []);

  // Smooth zero-cost GPU rotation & opacity fade
  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    const targetOpacity = isFrozen ? 0.85 : 0.0;
    opacityRef.current = THREE.MathUtils.lerp(opacityRef.current, targetOpacity, delta * 3.5);
    const mat = pointsRef.current.material as THREE.PointsMaterial;
    mat.opacity = opacityRef.current;
    pointsRef.current.visible = opacityRef.current > 0.01;

    if (pointsRef.current.visible) {
      pointsRef.current.rotation.y += delta * 0.025;
      pointsRef.current.rotation.x = Math.sin(pointsRef.current.rotation.y * 0.5) * 0.05;
    }
  });

  return (
    <points ref={pointsRef} visible={isFrozen}>
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
        opacity={isFrozen ? 0.85 : 0}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
};


