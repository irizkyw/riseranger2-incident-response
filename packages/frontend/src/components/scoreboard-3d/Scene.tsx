import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { Sun } from './Sun';
import { Planet } from './Planet';
import { LaserAttack } from './LaserAttack';
import { ImpactBurst } from './ImpactBurst';
import { ShieldDeflect } from './ShieldDeflect';
import { FrostParticles } from './FrostParticles';
import { PrimaTextOverlay } from './PrimaTextOverlay';
import audioSfx from '@/utils/audioSfx';

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
  isFrozen?: boolean;
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
  const defaultPos = useMemo(() => new THREE.Vector3(0, 18, 28), []);
  const defaultTarget = useMemo(() => new THREE.Vector3(0, 0, 0), []);

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
  isModalOpen,
  isFrozen = false
}) => {
  const [chargingTeamId, setChargingTeamId] = useState<string | null>(null);
  const [activeLasers, setActiveLasers] = useState<Array<{
    id: string;
    startPos: [number, number, number];
    endPos: [number, number, number];
    color: string;
    isFirstBlood: boolean;
    success: boolean;
    shotIndex: number;
    totalShots: number;
  }>>([]);
  const [impactPos, setImpactPos] = useState<[number, number, number] | null>(null);
  const [deflectPos, setDeflectPos] = useState<[number, number, number] | null>(null);
  const [isSunHit, setIsSunHit] = useState(false);
  const [shakeIntensity, setShakeIntensity] = useState(0);

  // Prima Sound & Animated Text Overlay State
  const [primaOverlay, setPrimaOverlay] = useState<{
    id: string;
    visible: boolean;
    teamName?: string;
    pointsGained?: number;
    isFirstBlood?: boolean;
  }>({ id: '', visible: false });

  const planetPositionsRef = useRef<{ [teamId: string]: [number, number, number] }>({});
  const currentAttackRef = useRef(currentAttack);
  currentAttackRef.current = currentAttack;
  const activeLasersRef = useRef(activeLasers);
  activeLasersRef.current = activeLasers;

  // Handle Attack Sequence
  useEffect(() => {
    if (!currentAttack) return;

    const teamId = currentAttack.teamId;
    const startPos = planetPositionsRef.current[teamId];
    if (!startPos) {
      onAttackComplete();
      return;
    }

    const isSuccess = currentAttack.success;
    const isFb = currentAttack.isFirstBlood;
    const timeouts: NodeJS.Timeout[] = [];

    if (isSuccess) {
      // 🌟 HIT BENAR / FIRST BLOOD:
      // 1. Charging agak lama (2.2s) & dramatis
      setChargingTeamId(teamId);
      audioSfx.playLaserCharge(isFb, 2.2);

      // 2. Tembak 1x LASER BESAR (Titan Hyper-Beam) setelah charge 2.2s
      timeouts.push(setTimeout(() => {
        setChargingTeamId(null);

        // Fetch real-time live position of the orbiting planet at the exact moment of firing!
        const liveStartPos = planetPositionsRef.current[teamId] || startPos;

        const laserInstance = {
          id: `hit-${Date.now()}`,
          startPos: liveStartPos,
          endPos: [0, 0, 0] as [number, number, number],
          color: isFb ? '#FFD700' : '#00F0FF',
          isFirstBlood: isFb,
          success: true,
          shotIndex: 0,
          totalShots: 1
        };
        setActiveLasers([laserInstance]);
        activeLasersRef.current = [laserInstance];

        // Suara tembakan laser besar
        audioSfx.playLaserShoot(isFb);
      }, 2200));
    } else {
      // ❌ MISS (GAGAL / INCORRECT SUBMISSION):
      // 1. Quick charge singkat (300ms)
      setChargingTeamId(teamId);

      timeouts.push(setTimeout(() => {
        setChargingTeamId(null);
      }, 300));

      // 2. Tembak 3x LASER CEPAT berturut-turut
      const shotIntervals = [300, 480, 660];
      shotIntervals.forEach((fireTime, idx) => {
        timeouts.push(setTimeout(() => {
          // Fetch real-time live position of the orbiting planet for EACH individual shot!
          const liveStartPos = planetPositionsRef.current[teamId] || startPos;

          const laserInstance = {
            id: `miss-${idx}-${Date.now()}`,
            startPos: liveStartPos,
            endPos: [0, 0, 0] as [number, number, number],
            color: '#EF4444',
            isFirstBlood: false,
            success: false,
            shotIndex: idx,
            totalShots: 3
          };

          setActiveLasers((prev) => {
            const next = [...prev, laserInstance];
            activeLasersRef.current = next;
            return next;
          });

          // Suara tembakan laser cepat
          audioSfx.playLaserShoot(false);
        }, fireTime));
      });
    }

    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, [currentAttack]);

  const handleLaserImpact = (laserId: string) => {
    const lasers = activeLasersRef.current;
    const laser = lasers.find((l) => l.id === laserId);
    const attack = currentAttackRef.current;
    if (!laser) return;

    if (laser.success) {
      // 💥 HIT BENAR: Ada efek meledak di matahari, suara ledakan besar, & guncangan layar
      setImpactPos([0, 0, 0]);
      setIsSunHit(true);
      audioSfx.playLaserHit(laser.isFirstBlood);
      setShakeIntensity(laser.isFirstBlood ? 0.75 : 0.4);

      if (laser.isFirstBlood) {
        // First Blood: Play First Blood announcer sound first!
        // When First Blood sound finishes, play "Prima" sound & trigger PRIMA! floating text
        setTimeout(() => {
          audioSfx.playFirstBloodDota(attack?.teamName, () => {
            audioSfx.playPrimaSound(() => {
              setPrimaOverlay({
                id: `fb-${Date.now()}-${Math.random()}`,
                visible: true,
                teamName: attack?.teamName,
                pointsGained: attack?.pointsGained,
                isFirstBlood: true
              });
            });
          });
        }, 350);
      } else {
        // Regular Hit: Play "Prima" sound immediately upon impact & trigger PRIMA! floating text
        setTimeout(() => {
          audioSfx.playPrimaSound(() => {
            setPrimaOverlay({
              id: `hit-${Date.now()}-${Math.random()}`,
              visible: true,
              teamName: attack?.teamName,
              pointsGained: attack?.pointsGained,
              isFirstBlood: false
            });
          });
        }, 150);
      }
    } else {
      // 🛡️ MISS: GAK ADA EFEK LEDAKAN! Hanya pantulan perisai (forcefield deflect) & SFX ricochet pantul
      setDeflectPos([0, 0, 0]);
      setIsSunHit(false);
      audioSfx.playMissDeflect();
      setShakeIntensity(0.06);
    }

    // Remove this laser from active list
    setActiveLasers((prev) => {
      const next = prev.filter((l) => l.id !== laserId);
      activeLasersRef.current = next;
      return next;
    });

    // If this is the last shot of the sequence, complete the attack
    if (laser.shotIndex === laser.totalShots - 1) {
      const waitTime = laser.success ? (laser.isFirstBlood ? 5400 : 3800) : 650;
      setTimeout(() => {
        setIsSunHit(false);
        setImpactPos(null);
        setDeflectPos(null);
        onAttackComplete();
      }, waitTime);
    }
  };

  const handlePlanetClick = (pos: [number, number, number], team: any) => {
    if (selectedTeam?.id === team.id) {
      onSelectTeam(null);
    } else {
      onSelectTeam(team);
    }
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
        dpr={[1, 1.25]}
        camera={{ position: [0, 18, 28], fov: 55, near: 0.5, far: 250 }}
        gl={{
          antialias: false,
          alpha: false,
          powerPreference: 'high-performance',
          stencil: false,
          depth: true
        }}
      >
        <color attach="background" args={[isFrozen ? '#020b18' : '#030008']} />

        {/* Ambient & Scene Lighting */}
        <ambientLight intensity={isFrozen ? 0.6 : 0.4} color={isFrozen ? '#7DD3FC' : '#FFFFFF'} />
        <directionalLight position={[15, 20, 15]} intensity={isFrozen ? 1.5 : 1.2} color={isFrozen ? '#BAE6FD' : '#FFFFFF'} />
        <pointLight position={[-15, -10, -15]} intensity={0.9} color="#00F0FF" />
        <pointLight position={[15, -10, 15]} intensity={0.9} color={isFrozen ? '#0284C7' : '#A855F7'} />

        {/* Floating 3D Frost & Ice Crystal Particles in Cosmic Space */}
        <FrostParticles isFrozen={isFrozen} count={200} />

        {/* Optimized Starfield Background */}
        <Stars radius={120} depth={60} count={1200} factor={3.5} saturation={0} fade speed={isFrozen ? 0.15 : 0.4} />

        {/* Camera Controls & Screen Shake */}
        <CameraController
          selectedTeamId={selectedTeam?.id || null}
          planetPositionsRef={planetPositionsRef}
          shakeIntensity={shakeIntensity}
          setShakeIntensity={setShakeIntensity}
        />

        {/* Central Sun Boss (Blazing Solar Core or Frozen Glacial Star) */}
        <Sun hp={sunHp} totalChallenges={totalChallenges} isHit={isSunHit} isFrozen={isFrozen} />

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

        {/* Laser Attack Sequence (1x Large Beam on Hit / 3x Rapid Burst on Miss) */}
        {activeLasers.map((laser) => (
          <LaserAttack
            key={laser.id}
            startPos={laser.startPos}
            endPos={laser.endPos}
            color={laser.color}
            isFirstBlood={laser.isFirstBlood}
            success={laser.success}
            onImpact={() => handleLaserImpact(laser.id)}
          />
        ))}

        {/* Explosion Impact Burst on Sun (HANYA MUNCUL SAAT HIT BENAR / FIRST BLOOD) */}
        {impactPos && (
          <ImpactBurst
            position={impactPos}
            color={currentAttack?.isFirstBlood ? '#FFD700' : '#00F0FF'}
            isFirstBlood={currentAttack?.isFirstBlood}
            onComplete={() => setImpactPos(null)}
          />
        )}

        {/* Forcefield Shield Deflection Barrier (HANYA MUNCUL SAAT MISS) */}
        {deflectPos && (
          <ShieldDeflect
            position={deflectPos}
            color="#EF4444"
            onComplete={() => setDeflectPos(null)}
          />
        )}

        {/* High-Performance Neon Bloom Post-Processing */}
        <EffectComposer multisampling={0} enableNormalPass={false}>
          <Bloom
            intensity={1.2}
            luminanceThreshold={0.25}
            luminanceSmoothing={0.7}
          />
        </EffectComposer>
      </Canvas>

      {/* Floating Animated "PRIMA!" Text Overlay */}
      <PrimaTextOverlay
        key={primaOverlay.id}
        id={primaOverlay.id}
        visible={primaOverlay.visible}
        teamName={primaOverlay.teamName}
        pointsGained={primaOverlay.pointsGained}
        isFirstBlood={primaOverlay.isFirstBlood}
        onAnimationComplete={() => setPrimaOverlay((prev) => ({ ...prev, visible: false }))}
      />
    </div>
  );
};

export default Scene;
