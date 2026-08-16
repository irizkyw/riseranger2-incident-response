import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface SunProps {
  hp: number;
  totalChallenges: number;
  isHit: boolean;
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
  varying vec2 vUv;
  varying vec3 vNormal;

  // Simple 2D noise for plasma turbulence
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
    // Turbulent plasma wave
    vec2 uv = vUv * 6.0;
    float n1 = noise(uv + vec2(uTime * 0.3, uTime * 0.2));
    float n2 = noise(uv * 2.0 - vec2(uTime * 0.5, -uTime * 0.4));
    float plasma = (n1 + n2) * 0.5;

    // Rim lighting / corona glow
    float rim = 1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0);
    rim = pow(rim, 2.0);

    vec3 baseColor = mix(uColor1, uColor2, plasma);
    vec3 finalColor = baseColor + (vec3(1.0, 0.5, 0.0) * rim * 1.5);

    // Add white flash when hit by laser
    finalColor = mix(finalColor, vec3(1.0, 1.0, 1.0), uHitIntensity);

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

export const Sun: React.FC<SunProps> = ({ hp, totalChallenges, isHit }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const coronaRef = useRef<THREE.Mesh>(null);
  const hitIntensityRef = useRef(0);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uColor1: { value: new THREE.Color('#FF2A00') }, // Fiery orange-red
    uColor2: { value: new THREE.Color('#FFCC00') }, // Bright gold-yellow
    uHitIntensity: { value: 0 }
  }), []);

  useFrame((state, delta) => {
    uniforms.uTime.value += delta;
    
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.15;
    }
    if (coronaRef.current) {
      coronaRef.current.rotation.y -= delta * 0.1;
      const scale = 1.15 + Math.sin(state.clock.elapsedTime * 3) * 0.03;
      coronaRef.current.scale.set(scale, scale, scale);
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
      {/* Core Plasma Sphere */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[2.5, 32, 32]} />
        <shaderMaterial
          vertexShader={sunVertexShader}
          fragmentShader={sunFragmentShader}
          uniforms={uniforms}
        />
      </mesh>

      {/* Corona Glow Mesh */}
      <mesh ref={coronaRef}>
        <sphereGeometry args={[2.55, 24, 24]} />
        <meshBasicMaterial
          color="#FF6600"
          transparent
          opacity={0.25}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Outer Halo */}
      <mesh scale={[1.3, 1.3, 1.3]}>
        <sphereGeometry args={[2.5, 24, 24]} />
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
