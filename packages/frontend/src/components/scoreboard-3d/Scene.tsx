import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { Sun } from './Sun';
import { Planet } from './Planet';
import { LaserAttack } from './LaserAttack';
import { ImpactBurst } from './ImpactBurst';

interface AttackEvent {
  id: string;
  teamId: string;
  teamName: string;
  success: boolean;
  isFirstBlood: boolean;
  pointsGained: number;
}

interface SceneProps {
  teams: any[];
  sunHp: number;
  totalChallenges: number;
  currentAttack: AttackEvent | null;
  onAttackComplete: () => void;
  selectedTeam: any | null;
  onSelectTeam: (team: any) => void;
  isModalOpen?: boolean;
}

// Helper component for Camera Animation and Screen Shake
const CameraController: React.FC<{
  selectedTeamId: string | null;
  planetPositionsRef: React.MutableRefObject<{ [teamId: string]: [number, number, number] }>;
  shakeIntensity: number;
  setShakeIntensity: React.Dispatch<React.SetStateAction<number>>;
}> = ({ selectedTeamId, planetPositionsRef, shakeIntensity, setShakeIntensity }) => {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const defaultPos = new THREE.Vector3(0, 18, 28);
  const defaultTarget = new THREE.Vector3(0, 0, 0);

  const prevPlanetPosRef = useRef<THREE.Vector3 | null>(null);
  const isLockedRef = useRef(false);

  // Reset lock state when selected team changes
  useEffect(() => {
    isLockedRef.current = false;
    prevPlanetPosRef.current = null;
  }, [selectedTeamId]);

  useFrame((_, delta) => {
    if (!controlsRef.current) return;

    // Clamp delta to prevent jerky frame jumps during hiccups
    const safeDelta = Math.min(delta, 0.05);

    const currentPos = selectedTeamId ? planetPositionsRef.current[selectedTeamId] : null;

    if (currentPos) {
      const currentPosVec = new THREE.Vector3(...currentPos);

      if (!isLockedRef.current) {
        // Initial smooth transition to focus on planet
        const targetCamPos = new THREE.Vector3(
          currentPos[0] * 1.3,
          currentPos[1] + 4,
          currentPos[2] * 1.3 + 6
        );
        camera.position.lerp(targetCamPos, safeDelta * 3.5);
        controlsRef.current.target.lerp(currentPosVec, safeDelta * 3.5);

        if (controlsRef.current.target.distanceTo(currentPosVec) < 0.3) {
          isLockedRef.current = true;
          prevPlanetPosRef.current = currentPosVec.clone();
        }
      } else {
        // Locked mode: Translate camera & target by planet orbital delta
        // User can freely orbit/rotate around planet without camera snapping back!
        if (prevPlanetPosRef.current) {
          const moveDelta = new THREE.Vector3().subVectors(currentPosVec, prevPlanetPosRef.current);
          camera.position.add(moveDelta);
          controlsRef.current.target.add(moveDelta);
        }
        prevPlanetPosRef.current = currentPosVec.clone();
      }
    } else {
      // Return to default orbit view
      isLockedRef.current = false;
      prevPlanetPosRef.current = null;
      camera.position.lerp(defaultPos, safeDelta * 2);
      controlsRef.current.target.lerp(defaultTarget, safeDelta * 2);
    }

    // Apply Screen Shake on Impact
    if (shakeIntensity > 0.01) {
      const rx = (Math.random() - 0.5) * shakeIntensity * 0.8;
      const ry = (Math.random() - 0.5) * shakeIntensity * 0.8;
      const rz = (Math.random() - 0.5) * shakeIntensity * 0.8;
      camera.position.add(new THREE.Vector3(rx, ry, rz));
      setShakeIntensity((prev) => Math.max(0, prev - safeDelta * 4));
    } else if (shakeIntensity !== 0) {
      setShakeIntensity(0);
    }

    controlsRef.current.update();
  });

  return <OrbitControls ref={controlsRef} enablePan={false} maxDistance={70} minDistance={4} />;
};

export const Scene: React.FC<SceneProps> = ({
  teams,
  sunHp,
  totalChallenges,
  currentAttack,
  onAttackComplete,
  selectedTeam,
  onSelectTeam,
  isModalOpen
}) => {
  const [chargingTeamId, setChargingTeamId] = useState<string | null>(null);
  const [activeLaser, setActiveLaser] = useState<{
    startPos: [number, number, number];
    endPos: [number, number, number];
    color: string;
    isFirstBlood: boolean;
    success: boolean;
  } | null>(null);
  const [impactPos, setImpactPos] = useState<[number, number, number] | null>(null);
  const [isSunHit, setIsSunHit] = useState(false);
  const [shakeIntensity, setShakeIntensity] = useState(0);

  const planetPositionsRef = useRef<{ [teamId: string]: [number, number, number] }>({});
  const [selectedTeamPos, setSelectedTeamPos] = useState<[number, number, number] | null>(null);

  // Update selected team 3D position when selection changes
  useEffect(() => {
    if (selectedTeam && planetPositionsRef.current[selectedTeam.id]) {
      setSelectedTeamPos(planetPositionsRef.current[selectedTeam.id]);
    } else {
      setSelectedTeamPos(null);
    }
  }, [selectedTeam]);

  // Handle Attack Sequence
  useEffect(() => {
    if (!currentAttack) return;

    const teamId = currentAttack.teamId;
    const teamColor = teams.find((t) => t.id === teamId)?.color || '#00F0FF';

    // Phase 1: Charging (1.2 seconds)
    setChargingTeamId(teamId);

    const laserTimer = setTimeout(() => {
      setChargingTeamId(null);
      // Phase 2: Fire Laser Bolt
      // Fetch EXACT live position of the charging planet right when firing!
      const currentPos = planetPositionsRef.current[teamId] || [10, 0, 0];
      
      setActiveLaser({
        startPos: [...currentPos],
        endPos: [0, 0, 0],
        color: teamColor,
        isFirstBlood: currentAttack.isFirstBlood,
        success: currentAttack.success
      });
    }, 1200);

    return () => clearTimeout(laserTimer);
  }, [currentAttack, teams]);

  const handleLaserImpact = () => {
    if (!activeLaser) return;

    if (activeLaser.success) {
      // Hit Boss Sun!
      setIsSunHit(true);
      setImpactPos([0, 0, 0]);
      setShakeIntensity(1.5); // Trigger camera shake!
      setTimeout(() => setIsSunHit(false), 500);
    } else {
      // Missed!
      setShakeIntensity(0.3);
    }

    setActiveLaser(null);
    onAttackComplete();
  };

  const handlePlanetClick = (pos: [number, number, number], team: any) => {
    planetPositionsRef.current[team.id] = pos;
    onSelectTeam(team);
  };

  // Register planet position for tracking attacks
  const registerPlanetPos = (teamId: string, pos: [number, number, number]) => {
    planetPositionsRef.current[teamId] = pos;
  };

  // Stable deterministic list of team IDs to prevent orbital shifting upon score changes
  const stableSortedTeamIds = React.useMemo(() => {
    return [...teams].map((t) => t.id).sort();
  }, [teams.map((t) => t.id).sort().join(',')]);

  return (
    <div className="w-full h-full relative bg-black">
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 18, 28], fov: 55, near: 0.5, far: 250 }}
        gl={{
          antialias: false,
          alpha: false,
          powerPreference: 'high-performance',
          stencil: false,
          depth: true,
          logarithmicDepthBuffer: true
        }}
      >
        <color attach="background" args={['#030008']} />

        {/* Ambient & Scene Lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight position={[15, 20, 15]} intensity={1.2} color="#FFFFFF" />
        <pointLight position={[-15, -10, -15]} intensity={0.8} color="#00F0FF" />
        <pointLight position={[15, -10, 15]} intensity={0.8} color="#A855F7" />

        {/* Optimized Starfield Background */}
        <Stars radius={120} depth={60} count={2200} factor={3.5} saturation={0} fade speed={0.4} />

        {/* Camera Controls & Screen Shake */}
        <CameraController
          selectedTeamId={selectedTeam?.id || null}
          planetPositionsRef={planetPositionsRef}
          shakeIntensity={shakeIntensity}
          setShakeIntensity={setShakeIntensity}
        />

        {/* Central Sun Boss */}
        <Sun hp={sunHp} totalChallenges={totalChallenges} isHit={isSunHit} />

        {/* Orbiting Squad Planets */}
        {teams.map((team, index) => (
          <Planet
            key={team.id}
            team={team}
            index={index}
            totalTeams={teams.length}
            stableSortedTeamIds={stableSortedTeamIds}
            isCharging={chargingTeamId === team.id}
            isModalOpen={isModalOpen}
            registerPlanetPos={registerPlanetPos}
            onPlanetClick={(pos, t) => {
              handlePlanetClick(pos, t);
            }}
          />
        ))}

        {/* Laser Attack Sequence */}
        {activeLaser && (
          <LaserAttack
            startPos={activeLaser.startPos}
            endPos={activeLaser.endPos}
            color={activeLaser.color}
            isFirstBlood={activeLaser.isFirstBlood}
            onImpact={handleLaserImpact}
          />
        )}

        {/* Explosion Impact Burst on Sun */}
        {impactPos && (
          <ImpactBurst
            position={impactPos}
            color={activeLaser?.isFirstBlood ? '#FFD700' : '#FF3300'}
            onComplete={() => setImpactPos(null)}
          />
        )}

        {/* High-Performance Neon Bloom Post-Processing */}
        <EffectComposer multisampling={0} enableNormalPass={false}>
          <Bloom
            intensity={1.3}
            luminanceThreshold={0.2}
            luminanceSmoothing={0.8}
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
};

export default Scene;
