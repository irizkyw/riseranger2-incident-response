import React, { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { ChargeEffect } from './ChargeEffect';

interface PlanetProps {
  team: {
    id: string;
    name: string;
    score: number;
    color: string;
    solvedChallenges?: string[];
    rank?: number;
  };
  index: number;
  totalTeams: number;
  isCharging: boolean;
  registerPlanetPos?: (id: string, pos: [number, number, number]) => void;
  onPlanetClick?: (pos: [number, number, number], team: any) => void;
}

export const Planet: React.FC<PlanetProps> = ({ team, index, totalTeams, isCharging, registerPlanetPos, onPlanetClick }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const atmosphereRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  const { orbitRadius, baseAngle, speed, planetSize, hasRing } = useMemo(() => {
    // Generate stable hash from team.id string to prevent teleporting when ranks change
    let hash = 0;
    if (team.id) {
      for (let i = 0; i < team.id.length; i++) {
        hash = team.id.charCodeAt(i) + ((hash << 5) - hash);
      }
    }
    const pseudoIndex = Math.abs(hash) % Math.max(1, totalTeams * 10);
    
    // Distribute angles based on stable pseudoIndex
    const angle = (360 / Math.max(1, totalTeams * 10)) * pseudoIndex * (Math.PI / 180);
    // Vary radius between 7 and 15 units based on hash
    const r = 7.5 + (Math.abs(hash) % 5) * 2.0;
    // Orbit speed varies by distance (Kepler-like)
    const spd = 0.08 / Math.sqrt(r * 0.1);
    // Planet size scales with score (clamped between 0.45 and 1.3)
    const size = Math.max(0.45, Math.min(1.3, 0.45 + ((team.score || 0) / 2500) * 0.85));
    // Every 3rd planet gets planetary rings for aesthetic variety based on hash
    const ring = Math.abs(hash) % 3 === 0;

    return { orbitRadius: r, baseAngle: angle, speed: spd, planetSize: size, hasRing: ring };
  }, [team.id, totalTeams, team.score]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    // Calculate dynamic orbit position
    const elapsed = state.clock.elapsedTime * speed + baseAngle;
    const x = Math.cos(elapsed) * orbitRadius;
    const z = Math.sin(elapsed) * orbitRadius;
    const y = Math.sin(elapsed * 2) * (1.2 + (index % 2)); // 3D wave inclination

    groupRef.current.position.set(x, y, z);
    if (registerPlanetPos) {
      registerPlanetPos(team.id, [x, y, z]);
    }

    // Self rotation
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.8;
    }
    if (ringRef.current) {
      ringRef.current.rotation.z += delta * 0.2;
    }
    if (atmosphereRef.current) {
      atmosphereRef.current.scale.setScalar(hovered || isCharging ? 1.25 : 1.1);
    }
  });

  const handleClick = (e: any) => {
    e.stopPropagation();
    if (groupRef.current && onPlanetClick) {
      onPlanetClick([groupRef.current.position.x, groupRef.current.position.y, groupRef.current.position.z], team);
    }
  };

  return (
    <group ref={groupRef} onClick={handleClick} onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}>
      {/* Core Planet Sphere */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[planetSize, 32, 32]} />
        <meshStandardMaterial
          color={team.color || '#00F0FF'}
          roughness={0.4}
          metalness={0.6}
          emissive={team.color || '#00F0FF'}
          emissiveIntensity={hovered || isCharging ? 0.8 : 0.2}
        />
      </mesh>

      {/* Atmospheric Glow */}
      <mesh ref={atmosphereRef} scale={[1.1, 1.1, 1.1]}>
        <sphereGeometry args={[planetSize, 32, 32]} />
        <meshBasicMaterial
          color={team.color || '#00F0FF'}
          transparent
          opacity={hovered || isCharging ? 0.35 : 0.15}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Optional Planetary Ring */}
      {hasRing && (
        <mesh ref={ringRef} rotation={[Math.PI / 3, 0, 0]}>
          <ringGeometry args={[planetSize * 1.3, planetSize * 2.1, 32]} />
          <meshBasicMaterial
            color={team.color || '#00F0FF'}
            transparent
            opacity={0.4}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}

      {/* Charging Particle System */}
      {isCharging && <ChargeEffect color={team.color || '#00F0FF'} radius={planetSize} />}

      {/* Interactive Tooltip / Label */}
      <Html position={[0, planetSize + 0.8, 0]} center distanceFactor={22}>
        <div
          className={`transition-all duration-300 pointer-events-none select-none px-2.5 py-1.5 rounded-lg backdrop-blur-md border ${
            hovered || isCharging ? 'bg-black/90 scale-110 shadow-[0_0_20px_rgba(0,240,255,0.4)] border-white' : 'bg-black/60 border-white/20'
          }`}
          style={{ borderColor: hovered ? team.color : undefined }}
        >
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full shrink-0 shadow-[0_0_8px]"
              style={{ backgroundColor: team.color || '#00F0FF', boxShadow: `0 0 8px ${team.color || '#00F0FF'}` }}
            />
            <span className="font-outfit font-black text-xs text-white tracking-wide">{team.name}</span>
          </div>
          <div className="flex items-center justify-between gap-3 mt-0.5 pt-0.5 border-t border-white/10 text-[10px] font-mono">
            <span className="text-muted-foreground">SCORE:</span>
            <span className="font-bold text-cyber-cyan">{team.score} PTS</span>
          </div>
          {(hovered || isCharging) && (
            <div className="flex items-center justify-between gap-3 text-[9px] font-mono text-muted-foreground/80 mt-0.5">
              <span>SOLVED:</span>
              <span className="text-white font-bold">{team.solvedChallenges?.length || 0} CHALS</span>
            </div>
          )}
        </div>
      </Html>
    </group>
  );
};
