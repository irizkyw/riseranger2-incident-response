import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface SunProps {
  hp: number;
  totalChallenges: number;
  isHit: boolean;
  isFrozen?: boolean;
}

// High-fidelity Photosphere & Plasma Convection Shader
const sunVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vWorldPosition;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const sunFragmentShader = `
  uniform float uTime;
  uniform vec3 uColorCore;
  uniform vec3 uColorMid;
  uniform vec3 uColorEdge;
  uniform float uHitIntensity;
  uniform float uFreezeProgress;
  
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vWorldPosition;

  // 3D Simplex noise functions for seamless spherical plasma turbulence
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);

    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);

    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;

    i = mod289(i);
    vec4 p = permute(permute(permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));

    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);

    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);

    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;

    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);

    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  // Optimized multi-layered turbulent granules
  float fbm(vec3 p) {
    return snoise(p) * 0.65 + snoise(p * 2.2) * 0.35;
  }

  void main() {
    float speed = mix(0.35, 0.06, uFreezeProgress);
    vec3 p = vPosition * mix(1.8, 2.5, uFreezeProgress);

    // Dynamic Convection flows
    float n1 = fbm(p + vec3(0.0, uTime * speed * 0.4, uTime * speed * 0.25));
    float n2 = fbm(p * 2.2 - vec3(uTime * speed * 0.6, 0.0, -uTime * speed * 0.4));
    float plasma = clamp((n1 * 0.6 + n2 * 0.4) + 0.5, 0.0, 1.0);

    // Dynamic solar granulation cell patterns
    float fineGranules = snoise(p * 5.0 + vec3(uTime * 0.2));
    plasma = mix(plasma, fineGranules * 0.5 + 0.5, 0.2);

    // Fresnel Rim Glow
    vec3 viewDir = normalize(-vWorldPosition);
    float fresnel = 1.0 - max(dot(vNormal, viewDir), 0.0);
    float rimPower = mix(2.2, 1.8, uFreezeProgress);
    float rim = pow(fresnel, rimPower);

    // Multi-stage color blending
    vec3 color = mix(uColorEdge, uColorMid, plasma);
    color = mix(color, uColorCore, pow(plasma, 2.2));

    // Add radiant chromatic corona rim
    vec3 hotRimColor = vec3(1.0, 0.7, 0.2);
    vec3 coldRimColor = vec3(0.3, 0.9, 1.0);
    vec3 activeRimColor = mix(hotRimColor, coldRimColor, uFreezeProgress);
    color += activeRimColor * rim * mix(2.2, 3.2, uFreezeProgress);

    // Laser Hit Explosive Thermonuclear Flash
    if (uHitIntensity > 0.001) {
      vec3 flashColor = vec3(1.0, 1.0, 1.0);
      color = mix(color, flashColor, uHitIntensity * 0.95);
      color += vec3(0.8, 0.9, 1.0) * uHitIntensity * 1.5;
    }

    gl_FragColor = vec4(color, 1.0);
  }
`;

export const Sun: React.FC<SunProps> = ({ hp, totalChallenges, isHit, isFrozen = false }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const coronaRef = useRef<THREE.Mesh>(null);
  const prominenceRef1 = useRef<THREE.Group>(null);
  const prominenceRef2 = useRef<THREE.Group>(null);
  const outerHaloRef = useRef<THREE.Mesh>(null);
  const flareSpikesRef = useRef<THREE.Group>(null);
  const accretionRingRef = useRef<THREE.Mesh>(null);
  const iceShellRef = useRef<THREE.Mesh>(null);
  const iceSpikesRef = useRef<THREE.Mesh>(null);

  const hitIntensityRef = useRef(0);
  const freezeProgressRef = useRef(isFrozen ? 1 : 0);

  // Blazing Thermonuclear Palettes
  const hotCore = useMemo(() => new THREE.Color('#FFF8D6'), []);
  const hotMid = useMemo(() => new THREE.Color('#FF7A00'), []);
  const hotEdge = useMemo(() => new THREE.Color('#CC1100'), []);

  // Arctic Glacial Frost Palettes
  const coldCore = useMemo(() => new THREE.Color('#FFFFFF'), []);
  const coldMid = useMemo(() => new THREE.Color('#00F0FF'), []);
  const coldEdge = useMemo(() => new THREE.Color('#0369A1'), []);

  // Static colors for corona, halo, and accretion ring to avoid per-frame allocations
  const coronaHot = useMemo(() => new THREE.Color('#FF9500'), []);
  const coronaCold = useMemo(() => new THREE.Color('#38BDF8'), []);
  const haloHot = useMemo(() => new THREE.Color('#FF4500'), []);
  const haloCold = useMemo(() => new THREE.Color('#00E5FF'), []);
  const accretionHot = useMemo(() => new THREE.Color('#FFAA00'), []);
  const accretionCold = useMemo(() => new THREE.Color('#7DD3FC'), []);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uColorCore: { value: new THREE.Color(isFrozen ? '#FFFFFF' : '#FFF8D6') },
    uColorMid: { value: new THREE.Color(isFrozen ? '#00F0FF' : '#FF7A00') },
    uColorEdge: { value: new THREE.Color(isFrozen ? '#0369A1' : '#CC1100') },
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
    uniforms.uColorCore.value.lerpColors(hotCore, coldCore, fp);
    uniforms.uColorMid.value.lerpColors(hotMid, coldMid, fp);
    uniforms.uColorEdge.value.lerpColors(hotEdge, coldEdge, fp);

    // Rotation & Convection
    const rotSpeed = THREE.MathUtils.lerp(0.18, 0.02, fp);
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * rotSpeed;
    }

    // Dynamic Corona Breathing & Pulse
    if (coronaRef.current) {
      coronaRef.current.rotation.y -= delta * (rotSpeed * 0.9);
      coronaRef.current.rotation.z += delta * 0.04;
      const pulseScale = 1.08 + Math.sin(state.clock.elapsedTime * THREE.MathUtils.lerp(2.5, 0.8, fp)) * 0.03;
      coronaRef.current.scale.setScalar(pulseScale);
      const mat = coronaRef.current.material as THREE.MeshBasicMaterial;
      mat.color.lerpColors(coronaHot, coronaCold, fp);
      mat.opacity = THREE.MathUtils.lerp(0.35, 0.5, fp);
    }

    // Dynamic Coronal Prominences
    if (prominenceRef1.current) {
      prominenceRef1.current.rotation.x += delta * 0.12;
      prominenceRef1.current.rotation.y += delta * 0.16;
    }
    if (prominenceRef2.current) {
      prominenceRef2.current.rotation.y -= delta * 0.14;
      prominenceRef2.current.rotation.z += delta * 0.09;
    }

    // Outer Atmospheric Flare Nebula
    if (outerHaloRef.current) {
      const haloScale = 1.38 + Math.sin(state.clock.elapsedTime * 1.5) * 0.04;
      outerHaloRef.current.scale.setScalar(haloScale);
      const mat = outerHaloRef.current.material as THREE.MeshBasicMaterial;
      mat.color.lerpColors(haloHot, haloCold, fp);
      mat.opacity = THREE.MathUtils.lerp(0.18, 0.28, fp);
    }

    // Diffraction Stellar Flare Rays (Anamorphic Starburst)
    if (flareSpikesRef.current) {
      flareSpikesRef.current.rotation.z += delta * 0.05;
      const flarePulse = 1.0 + Math.sin(state.clock.elapsedTime * 3) * 0.08;
      flareSpikesRef.current.scale.setScalar(flarePulse);
    }

    // Accretion / Magnetic Defense Belt
    if (accretionRingRef.current) {
      accretionRingRef.current.rotation.z += delta * 0.18;
      const mat = accretionRingRef.current.material as THREE.MeshBasicMaterial;
      mat.color.lerpColors(accretionHot, accretionCold, fp);
      mat.opacity = THREE.MathUtils.lerp(0.45, 0.25, fp);
    }

    // Ice Shell & Diamond Frost Crystals
    if (iceShellRef.current) {
      iceShellRef.current.rotation.y += delta * 0.06;
      iceShellRef.current.rotation.x += delta * 0.04;
      const mat = iceShellRef.current.material as THREE.MeshStandardMaterial;
      mat.opacity = fp * 0.85;
      mat.transparent = true;
    }

    if (iceSpikesRef.current) {
      iceSpikesRef.current.rotation.y -= delta * 0.04;
      iceSpikesRef.current.rotation.z += delta * 0.03;
      const mat = iceSpikesRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = fp * 0.55;
      mat.transparent = true;
    }

    // Laser hit detonation decay
    if (isHit) {
      hitIntensityRef.current = 1.0;
    } else {
      hitIntensityRef.current = THREE.MathUtils.lerp(hitIntensityRef.current, 0, delta * 4.5);
    }
    uniforms.uHitIntensity.value = hitIntensityRef.current;
  });

  return (
    <group position={[0, 0, 0]}>
      {/* 1. Core Photosphere Sphere with Ultra-HD Simplex Plasma Shader */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[2.5, 64, 64]} />
        <shaderMaterial
          vertexShader={sunVertexShader}
          fragmentShader={sunFragmentShader}
          uniforms={uniforms}
        />
      </mesh>

      {/* 2. Inner Turbulent Coronal Plasma Atmosphere */}
      <mesh ref={coronaRef}>
        <sphereGeometry args={[2.58, 36, 36]} />
        <meshBasicMaterial
          color="#FF9500"
          transparent
          opacity={0.35}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 3. Coronal Prominence Arcs (Magnetic Plasma Loops) */}
      <group ref={prominenceRef1}>
        <mesh rotation={[0.4, 0.2, 0.8]}>
          <torusGeometry args={[2.58, 0.06, 16, 64, Math.PI * 0.7]} />
          <meshBasicMaterial
            color={isFrozen ? '#7DD3FC' : '#FFAE00'}
            transparent
            opacity={0.7}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
        <mesh rotation={[-0.6, 1.2, 0.3]}>
          <torusGeometry args={[2.62, 0.05, 16, 64, Math.PI * 0.5]} />
          <meshBasicMaterial
            color={isFrozen ? '#38BDF8' : '#FF4D00'}
            transparent
            opacity={0.65}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </group>

      <group ref={prominenceRef2}>
        <mesh rotation={[1.1, -0.7, 0.5]}>
          <torusGeometry args={[2.6, 0.05, 16, 64, Math.PI * 0.6]} />
          <meshBasicMaterial
            color={isFrozen ? '#E0F2FE' : '#FFD700'}
            transparent
            opacity={0.8}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </group>

      {/* 4. Planetary Accretion / Magnetic Shield Ring */}
      <mesh ref={accretionRingRef} rotation={[Math.PI / 2.3, 0, 0]}>
        <ringGeometry args={[2.9, 3.4, 64]} />
        <meshBasicMaterial
          color="#FFAA00"
          transparent
          opacity={0.45}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 5. Crystalline Glacial Ice Shell (Appears during freeze) */}
      <mesh ref={iceShellRef} scale={[1.05, 1.05, 1.05]}>
        <icosahedronGeometry args={[2.5, 3]} />
        <meshStandardMaterial
          color="#BAE6FD"
          roughness={0.05}
          metalness={0.4}
          wireframe={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 6. Outer Diamond Frost Geometry Facets */}
      <mesh ref={iceSpikesRef} scale={[1.14, 1.14, 1.14]}>
        <dodecahedronGeometry args={[2.5, 1]} />
        <meshBasicMaterial
          color="#38BDF8"
          wireframe
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 7. Outer Atmospheric Nebula Halo */}
      <mesh ref={outerHaloRef} scale={[1.38, 1.38, 1.38]}>
        <sphereGeometry args={[2.5, 32, 32]} />
        <meshBasicMaterial
          color="#FF4500"
          transparent
          opacity={0.18}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 8. Diffraction Starburst Flare Spikes */}
      <group ref={flareSpikesRef}>
        {/* Horizontal & Vertical Cross Flares */}
        <mesh rotation={[0, 0, 0]}>
          <planeGeometry args={[11.0, 0.45]} />
          <meshBasicMaterial
            color={isFrozen ? '#38BDF8' : '#FF9900'}
            transparent
            opacity={isFrozen ? 0.22 : 0.35}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <planeGeometry args={[11.0, 0.45]} />
          <meshBasicMaterial
            color={isFrozen ? '#38BDF8' : '#FF9900'}
            transparent
            opacity={isFrozen ? 0.22 : 0.35}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
          />
        </mesh>
        {/* Diagonal Soft Cross Flares */}
        <mesh rotation={[0, 0, Math.PI / 4]}>
          <planeGeometry args={[7.5, 0.25]} />
          <meshBasicMaterial
            color={isFrozen ? '#E0F2FE' : '#FFCC00'}
            transparent
            opacity={isFrozen ? 0.15 : 0.25}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh rotation={[0, 0, -Math.PI / 4]}>
          <planeGeometry args={[7.5, 0.25]} />
          <meshBasicMaterial
            color={isFrozen ? '#E0F2FE' : '#FFCC00'}
            transparent
            opacity={isFrozen ? 0.15 : 0.25}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>

      {/* 9. Core Point Light Illuminating Orbiting Drones */}
      <pointLight
        color={isFrozen ? '#BAE6FD' : '#FFD27D'}
        intensity={isFrozen ? 3.5 : 5.5}
        distance={90}
        decay={1.2}
      />
    </group>
  );
};
