import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface SunProps {
  hp: number;
  totalChallenges: number;
  isHit: boolean;
  isFrozen?: boolean;
}

const sunVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const sunFragmentShader = `
  uniform float uTime;
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform float uHitIntensity;
  uniform float uFreezeProgress;
  varying vec2 vUv;
  varying vec3 vNormal;

  // 2D noise for plasma / frost turbulence
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  void main() {
    // Turbulent wave speed slows down as freeze increases
    float timeSpeed = mix(1.0, 0.2, uFreezeProgress);
    vec2 uv = vUv * mix(6.0, 9.0, uFreezeProgress);
    float n1 = noise(uv + vec2(uTime * 0.3 * timeSpeed, uTime * 0.2 * timeSpeed));
    float n2 = noise(uv * 2.0 - vec2(uTime * 0.5 * timeSpeed, -uTime * 0.4 * timeSpeed));
    float pattern = (n1 + n2) * 0.5;

    // Rim lighting / corona glow
    float rim = 1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0);
    rim = pow(rim, mix(2.0, 2.5, uFreezeProgress));

    vec3 baseColor = mix(uColor1, uColor2, pattern);
    
    // Rim color: Hot amber when warm, icy diamond cyan when frozen
    vec3 hotRim = vec3(1.0, 0.5, 0.0);
    vec3 coldRim = vec3(0.4, 0.85, 1.0);
    vec3 activeRim = mix(hotRim, coldRim, uFreezeProgress);

    vec3 finalColor = baseColor + (activeRim * rim * mix(1.5, 2.2, uFreezeProgress));

    // Add white flash when hit by laser
    finalColor = mix(finalColor, vec3(1.0, 1.0, 1.0), uHitIntensity);

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

export const Sun: React.FC<SunProps> = ({ hp, totalChallenges, isHit, isFrozen = false }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const coronaRef = useRef<THREE.Mesh>(null);
  const outerHaloRef = useRef<THREE.Mesh>(null);
  const iceShellRef = useRef<THREE.Mesh>(null);
  const iceSpikesRef = useRef<THREE.Mesh>(null);

  const hitIntensityRef = useRef(0);
  const freezeProgressRef = useRef(isFrozen ? 1 : 0);

  // Target Colors for Blazing vs Frozen
  const hotColor1 = useMemo(() => new THREE.Color('#FF2A00'), []);
  const hotColor2 = useMemo(() => new THREE.Color('#FFCC00'), []);
  const coldColor1 = useMemo(() => new THREE.Color('#0284C7'), []); // Arctic Glacial Blue
  const coldColor2 = useMemo(() => new THREE.Color('#E0F2FE'), []); // Diamond Frost White

  const hotCorona = useMemo(() => new THREE.Color('#FF6600'), []);
  const coldCorona = useMemo(() => new THREE.Color('#38BDF8'), []);

  const hotHalo = useMemo(() => new THREE.Color('#FF9900'), []);
  const coldHalo = useMemo(() => new THREE.Color('#00F0FF'), []);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uColor1: { value: new THREE.Color(isFrozen ? '#0284C7' : '#FF2A00') },
    uColor2: { value: new THREE.Color(isFrozen ? '#E0F2FE' : '#FFCC00') },
    uHitIntensity: { value: 0 },
    uFreezeProgress: { value: isFrozen ? 1 : 0 }
  }), []);

  useFrame((state, delta) => {
    // Smoothly transition freeze progress
    const targetFreeze = isFrozen ? 1.0 : 0.0;
    freezeProgressRef.current = THREE.MathUtils.lerp(freezeProgressRef.current, targetFreeze, delta * 2.5);
    const fp = freezeProgressRef.current;

    uniforms.uFreezeProgress.value = fp;
    uniforms.uTime.value += delta;

    // Dynamically blend core shader colors
    uniforms.uColor1.value.lerpColors(hotColor1, coldColor1, fp);
    uniforms.uColor2.value.lerpColors(hotColor2, coldColor2, fp);

    // Rotation speed slows down when frozen
    const rotSpeed = THREE.MathUtils.lerp(0.15, 0.03, fp);
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * rotSpeed;
    }

    if (coronaRef.current) {
      coronaRef.current.rotation.y -= delta * (rotSpeed * 0.8);
      const pulseScale = THREE.MathUtils.lerp(1.15, 1.08, fp) + Math.sin(state.clock.elapsedTime * THREE.MathUtils.lerp(3, 1, fp)) * 0.02;
      coronaRef.current.scale.set(pulseScale, pulseScale, pulseScale);
      (coronaRef.current.material as THREE.MeshBasicMaterial).color.lerpColors(hotCorona, coldCorona, fp);
    }

    if (outerHaloRef.current) {
      (outerHaloRef.current.material as THREE.MeshBasicMaterial).color.lerpColors(hotHalo, coldHalo, fp);
      (outerHaloRef.current.material as THREE.MeshBasicMaterial).opacity = THREE.MathUtils.lerp(0.12, 0.25, fp);
    }

    // Ice Shell & Crystals Rotation & Opacity
    if (iceShellRef.current) {
      iceShellRef.current.rotation.y += delta * 0.08;
      iceShellRef.current.rotation.x += delta * 0.05;
      (iceShellRef.current.material as THREE.MeshStandardMaterial).opacity = fp * 0.75;
      (iceShellRef.current.material as THREE.MeshStandardMaterial).transparent = true;
    }

    if (iceSpikesRef.current) {
      iceSpikesRef.current.rotation.y -= delta * 0.05;
      iceSpikesRef.current.rotation.z += delta * 0.03;
      (iceSpikesRef.current.material as THREE.MeshBasicMaterial).opacity = fp * 0.45;
      (iceSpikesRef.current.material as THREE.MeshBasicMaterial).transparent = true;
    }

    // Animate hit flash decay
    if (isHit) {
      hitIntensityRef.current = 1.0;
    } else {
      hitIntensityRef.current = THREE.MathUtils.lerp(hitIntensityRef.current, 0, delta * 5);
    }
    uniforms.uHitIntensity.value = hitIntensityRef.current;
  });

  return (
    <group position={[0, 0, 0]}>
      {/* 1. Core Sphere (Blazing Plasma or Glacial Arctic Core) */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[2.5, 36, 36]} />
        <shaderMaterial
          vertexShader={sunVertexShader}
          fragmentShader={sunFragmentShader}
          uniforms={uniforms}
        />
      </mesh>

      {/* 2. Crystalline Glacial Ice Shell (Appears during freeze) */}
      <mesh ref={iceShellRef} scale={[1.04, 1.04, 1.04]}>
        <icosahedronGeometry args={[2.5, 2]} />
        <meshStandardMaterial
          color="#BAE6FD"
          roughness={0.1}
          metalness={0.3}
          wireframe={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 3. Outer Diamond Frost Geometry Facets */}
      <mesh ref={iceSpikesRef} scale={[1.12, 1.12, 1.12]}>
        <dodecahedronGeometry args={[2.5, 1]} />
        <meshBasicMaterial
          color="#38BDF8"
          wireframe
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 4. Corona Glow Mesh */}
      <mesh ref={coronaRef}>
        <sphereGeometry args={[2.55, 28, 28]} />
        <meshBasicMaterial
          color="#FF6600"
          transparent
          opacity={0.25}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 5. Outer Atmospheric Halo */}
      <mesh ref={outerHaloRef} scale={[1.35, 1.35, 1.35]}>
        <sphereGeometry args={[2.5, 28, 28]} />
        <meshBasicMaterial
          color="#FF9900"
          transparent
          opacity={0.12}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
};
