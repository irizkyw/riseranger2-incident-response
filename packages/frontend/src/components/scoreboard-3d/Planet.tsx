import React, { useRef, useMemo, useState, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, useGLTF } from '@react-three/drei';
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
  stableSortedTeamIds?: string[];
  isCharging: boolean;
  isModalOpen?: boolean;
  registerPlanetPos?: (id: string, pos: [number, number, number]) => void;
  onPlanetClick?: (pos: [number, number, number], team: any) => void;
}

// 3D Drone Model Instance with Team Neon Accents & Rear Aft Thrusters
const DroneModel: React.FC<{
  color: string;
  isCharging: boolean;
  hovered: boolean;
  scale: number;
}> = ({ color, isCharging, hovered, scale }) => {
  const { scene } = useGLTF('/models/3d-drone.glb');
  const thrusterRef1 = useRef<THREE.Mesh>(null);
  const thrusterRef2 = useRef<THREE.Mesh>(null);

  // Clone scene so each team drone has independent customized materials
  const clonedScene = useMemo(() => {
    const cloned = scene.clone(true);
    const teamColor = new THREE.Color(color || '#00F0FF');

    cloned.traverse((child: any) => {
      if (child.isMesh) {
        if (child.material) {
          // Clone material for this team instance
          child.material = child.material.clone();
          child.material.roughness = 0.35;
          child.material.metalness = 0.65;
          // Apply glowing team cyber accent to drone hull
          child.material.emissive = teamColor;
          child.material.emissiveIntensity = 0.6;
        }
      }
    });
    return cloned;
  }, [scene, color]);

  // Dynamic Thruster Exhaust Flicker
  useFrame((state) => {
    const flicker = 1.0 + Math.sin(state.clock.elapsedTime * 28) * 0.35 + (isCharging ? 0.9 : 0);
    if (thrusterRef1.current) {
      thrusterRef1.current.scale.set(flicker, flicker * 1.6, flicker);
    }
    if (thrusterRef2.current) {
      thrusterRef2.current.scale.set(flicker, flicker * 1.6, flicker);
    }
  });

  return (
    <group scale={[scale * 1.6, scale * 1.6, scale * 1.6]}>
      {/* 1. Cloned 3D Drone GLB Model (+Z is Nose/Front, -Z is Tail/Back) */}
      <primitive object={clonedScene} />

      {/* 2. Twin Aft Neon Plasma Thruster Jets (Positioned at -Z Tail) */}
      <group position={[0, -0.01, -0.46]}>
        {/* Left Thruster Exhaust */}
        <mesh ref={thrusterRef1} position={[-0.18, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.06, 0.3, 12]} />
          <meshBasicMaterial
            color={color || '#00F0FF'}
            transparent
            opacity={hovered || isCharging ? 0.98 : 0.8}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
        {/* Right Thruster Exhaust */}
        <mesh ref={thrusterRef2} position={[0.18, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.06, 0.3, 12]} />
          <meshBasicMaterial
            color={color || '#00F0FF'}
            transparent
            opacity={hovered || isCharging ? 0.98 : 0.8}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </group>

      {/* 3. Drone Holographic Shield Bubble on Hover / Charge */}
      {(hovered || isCharging) && (
        <mesh scale={[0.7, 0.35, 0.65]}>
          <sphereGeometry args={[1.0, 20, 20]} />
          <meshBasicMaterial
            color={color || '#00F0FF'}
            transparent
            opacity={isCharging ? 0.45 : 0.25}
            wireframe
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}
    </group>
  );
};

// Fallback geometric cyber drone while GLTF is loading
const DroneFallback: React.FC<{ color: string; scale: number }> = ({ color, scale }) => {
  return (
    <group scale={[scale, scale, scale]}>
      <mesh>
        <boxGeometry args={[1.2, 0.25, 0.8]} />
        <meshStandardMaterial
          color={color || '#00F0FF'}
          emissive={color || '#00F0FF'}
          emissiveIntensity={0.6}
          roughness={0.3}
          metalness={0.8}
        />
      </mesh>
    </group>
  );
};

export const Planet: React.FC<PlanetProps> = ({
  team,
  index,
  totalTeams,
  stableSortedTeamIds,
  isCharging,
  isModalOpen,
  registerPlanetPos,
  onPlanetClick
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const droneOrientRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const { orbitRadius, baseAngle, speed, droneSize, inclination } = useMemo(() => {
    const total = Math.max(1, totalTeams);
    const sortedIdx = stableSortedTeamIds && stableSortedTeamIds.indexOf(team.id) !== -1
      ? stableSortedTeamIds.indexOf(team.id)
      : index;

    let r: number;
    let angle: number;
    let spd: number;

    if (total <= 7) {
      // 1 to 7 teams: Each team gets its own dedicated, strictly unique orbital track!
      r = 7.5 + sortedIdx * 2.5;
      angle = (sortedIdx * (2 * Math.PI / total) * 1.618) % (2 * Math.PI);
      spd = 0.14 / Math.sqrt(r * 0.15);
    } else {
      // > 7 teams: Distribute cleanly across concentric orbital lanes
      const numLanes = Math.min(8, Math.max(5, Math.ceil(total / 3)));
      const lane = sortedIdx % numLanes;
      const slotInLane = Math.floor(sortedIdx / numLanes);
      const teamsInLane = Math.ceil((total - lane) / numLanes);

      r = 7.5 + lane * 2.5;
      angle = (slotInLane * (2 * Math.PI / Math.max(1, teamsInLane)) + lane * 0.85) % (2 * Math.PI);
      spd = 0.14 / Math.sqrt(r * 0.15);
    }

    // 3D vertical inclination offset so orbits have distinct depth
    const incl = (((sortedIdx * 2) % 5) - 2) * 0.5;

    // Drone size scales with score (clamped between 0.65 and 1.35)
    const size = Math.max(0.65, Math.min(1.35, 0.65 + ((team.score || 0) / 2500) * 0.7));

    return { orbitRadius: r, baseAngle: angle, speed: spd, droneSize: size, inclination: incl };
  }, [team.id, team.score, totalTeams, stableSortedTeamIds, index]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    // Calculate dynamic orbit position
    const elapsed = state.clock.elapsedTime * speed + baseAngle;
    const x = Math.cos(elapsed) * orbitRadius;
    const z = Math.sin(elapsed) * orbitRadius;
    const hoverBob = Math.sin(state.clock.elapsedTime * 3.5 + baseAngle) * 0.12;
    const y = Math.sin(elapsed * 1.5 + baseAngle) * 0.8 + inclination + hoverBob;

    groupRef.current.position.set(x, y, z);
    if (registerPlanetPos) {
      registerPlanetPos(team.id, [x, y, z]);
    }

    // Drone orientation & flight vector banking
    if (droneOrientRef.current) {
      if (isCharging) {
        // When charging weapons: Aim nose (+Z) directly towards the Sun [0, 0, 0]
        const targetAngle = Math.atan2(-x, -z);
        droneOrientRef.current.rotation.y = THREE.MathUtils.lerp(
          droneOrientRef.current.rotation.y,
          targetAngle,
          delta * 7
        );
        droneOrientRef.current.rotation.x = THREE.MathUtils.lerp(droneOrientRef.current.rotation.x, 0.1, delta * 7);
        droneOrientRef.current.rotation.z = THREE.MathUtils.lerp(droneOrientRef.current.rotation.z, 0, delta * 7);
      } else {
        // Normal Flight: Point nose (+Z) along flight tangent velocity vector
        const dx = -Math.sin(elapsed);
        const dz = Math.cos(elapsed);
        const flightHeading = Math.atan2(dx, dz);
        
        droneOrientRef.current.rotation.y = flightHeading;
        // Aerodynamic banking into the curve
        droneOrientRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 2) * 0.08 - 0.15;
        droneOrientRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 3) * 0.05;
      }
    }

    // Orbit Compass Reticle Rotation
    if (ringRef.current) {
      ringRef.current.rotation.z += delta * 0.8;
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
      {/* Flight Orientation Group */}
      <group ref={droneOrientRef}>
        <Suspense fallback={<DroneFallback color={team.color} scale={droneSize} />}>
          <DroneModel
            color={team.color || '#00F0FF'}
            isCharging={isCharging}
            hovered={hovered}
            scale={droneSize}
          />
        </Suspense>
      </group>

      {/* Holographic Tactical Orbit Ring under Drone */}
      <mesh ref={ringRef} position={[0, -0.45, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[droneSize * 1.1, droneSize * 1.35, 32]} />
        <meshBasicMaterial
          color={team.color || '#00F0FF'}
          transparent
          opacity={hovered || isCharging ? 0.75 : 0.3}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Charging Weapon Particle System */}
      {isCharging && <ChargeEffect color={team.color || '#00F0FF'} radius={droneSize * 1.4} />}

      {/* Interactive Tooltip / Label */}
      {!isModalOpen && (
        <Html
          position={[0, droneSize + 1.2, 0]}
          center
          distanceFactor={14}
          zIndexRange={[10, 0]}
          style={{ willChange: 'transform', pointerEvents: 'none' }}
        >
          <div
            className={`planet-3d-tag transition-transform duration-200 pointer-events-none select-none px-2.5 py-1.5 rounded-lg border ${
              hovered || isCharging ? 'bg-black/95 scale-105 shadow-[0_0_15px_rgba(0,240,255,0.4)] border-white' : 'bg-black/85 border-white/20'
            }`}
            style={{ borderColor: hovered ? team.color : undefined, minWidth: '100px' }}
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
      )}
    </group>
  );
};

// Preload 3D drone GLB model
useGLTF.preload('/models/3d-drone.glb');
