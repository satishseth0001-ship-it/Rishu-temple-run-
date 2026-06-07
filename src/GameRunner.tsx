import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky } from '@react-three/drei';
import * as THREE from 'three';

const LANE_WIDTH = 2.5;
const GROUND_SPEED = 25;

// --------- Simple Sound Manager using Web Audio API ---------
class SoundManager {
  ctx: AudioContext | null = null;
  bgSeqInterval: number | null = null;

  async init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
      } catch (e) {
        console.error("Audio resume failed", e);
      }
    }
  }

  async startBGM() {
    await this.init();
    if (this.bgSeqInterval) return;

    const sequence = [
      130.81, // C3
      0, 
      130.81, 
      155.56, // Eb3
      0, 
      130.81, 
      0, 
      116.54, // Bb2
    ];

    let step = 0;
    
    this.bgSeqInterval = window.setInterval(() => {
      if (!this.ctx || this.ctx.state !== 'running') return;
      const freq = sequence[step % sequence.length];
      if (freq > 0) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.type = 'sawtooth';

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 1000;
        
        osc.disconnect();
        osc.connect(filter);
        filter.connect(gain);

        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
        osc.start(this.ctx.currentTime);
        osc.stop(this.ctx.currentTime + 0.2);
      }
      step++;
    }, 200) as unknown as number; // ~150 BPM
  }

  stopBGM() {
    if (this.bgSeqInterval !== null) {
      window.clearInterval(this.bgSeqInterval);
      this.bgSeqInterval = null;
    }
  }

  async playJump() {
    await this.init();
    if (!this.ctx || this.ctx.state !== 'running') return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);
    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + 0.2);
  }

  async playCoin() {
    await this.init();
    if (!this.ctx || this.ctx.state !== 'running') return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.type = 'square';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.setValueAtTime(1200, this.ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + 0.3);
  }

  async playHit() {
    await this.init();
    if (!this.ctx || this.ctx.state !== 'running') return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + 0.3);
  }
}
const sounds = new SoundManager();
export { sounds };
// -------------------------------------------------------------

interface Obstacle {
  id: number;
  type: 'jump' | 'slide' | 'block' | 'river';
  lane: number;
  z: number;
}

interface Coin {
  id: number;
  lane: number;
  z: number;
  y: number;
  collected: boolean;
}

export default function GameRunner({ gameState, onGameOver, onScore, onCoin }: { gameState: string, onGameOver: () => void, onScore: (s: number) => void, onCoin: () => void }) {
  const [speed, setSpeed] = useState(GROUND_SPEED);

  useEffect(() => {
    // Initialize audio on first physical interaction or start
    if (gameState === 'playing') {
      sounds.startBGM();
    } else {
      sounds.stopBGM();
    }
    
    return () => {
      sounds.stopBGM();
    };
  }, [gameState]);

  return (
    <Canvas shadows camera={{ position: [0, 5, 8], fov: 60 }} dpr={[1, 1.5]}>
      {/* Sunny Day Fog & Background */}
      <fog attach="fog" args={['#87CEEB', 30, 90]} />
      <color attach="background" args={['#87CEEB']} />
      
      <ambientLight intensity={0.9} />
      <directionalLight 
        position={[20, 50, -20]} 
        castShadow 
        intensity={1.5} 
        shadow-bias={-0.0005}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
        shadow-mapSize={[1024, 1024]}
      />
      
      <Sky sunPosition={[100, 20, -100]} turbidity={0.1} rayleigh={0.5} />

      <WorldController 
        gameState={gameState}
        speed={speed} 
        onGameOver={onGameOver} 
        onScore={onScore} 
        onCoin={onCoin} 
        setSpeed={setSpeed} 
      />
    </Canvas>
  );
}

function WorldController({ gameState, speed, onGameOver, onScore, onCoin, setSpeed }: any) {
  const { camera } = useThree();
  const playerRef = useRef<THREE.Group>(null);
  
  // Player state
  const targetLane = useRef(0);
  const velocityY = useRef(0);
  const isJumping = useRef(false);
  const isSliding = useRef(false);
  const slideTimer = useRef(0);

  // World state
  const obstacles = useRef<Obstacle[]>([]);
  const coins = useRef<Coin[]>([]);
  const worldZOffset = useRef(0);
  const scoreCounter = useRef(0);
  const obstacleIdCounter = useRef(0);
  const coinIdCounter = useRef(0);

  const isDead = useRef(false);
  const deathTimer = useRef(0);
  const monsterRef = useRef<THREE.Group>(null);

  React.useEffect(() => {
    if (gameState === 'playing') {
      // Reset everything for a new run
      setSpeed(GROUND_SPEED);
      worldZOffset.current = 0;
      scoreCounter.current = 0;
      obstacles.current = [];
      coins.current = [];
      isDead.current = false;
      deathTimer.current = 0;
      targetLane.current = 0;
      isJumping.current = false;
      isSliding.current = false;
      if (playerRef.current) playerRef.current.position.set(0, 0, 0);
      if (monsterRef.current) monsterRef.current.position.set(0, 0, 6);
    }
  }, [gameState, setSpeed]);

  // Input Handling: Swipe to move
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'playing' || isDead.current) return;
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        targetLane.current = Math.max(-1, targetLane.current - 1);
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        targetLane.current = Math.min(1, targetLane.current + 1);
      } else if (e.code === 'ArrowUp' || e.code === 'Space' || e.code === 'KeyW') {
        if (!isJumping.current && !isSliding.current) {
          isJumping.current = true;
          velocityY.current = 15;
          sounds.playJump();
        }
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        if (!isJumping.current && !isSliding.current) {
          isSliding.current = true;
          slideTimer.current = 0.6;
        } else if (isJumping.current) {
          velocityY.current -= 30; // fast fall
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  const spawnObstacle = (zPos: number) => {
    const typeRoll = Math.random();
    let type: Obstacle['type'] = 'block';
    if (typeRoll < 0.25) type = 'jump';
    else if (typeRoll < 0.5) type = 'slide';
    else if (typeRoll < 0.65) type = 'river';

    const lane = type === 'river' ? 0 : Math.floor(Math.random() * 3) - 1;

    obstacles.current.push({ id: ++obstacleIdCounter.current, type, lane, z: zPos });

    if (Math.random() > 0.4 && type !== 'river') {
      const coinLane = (lane === 0) ? (Math.random() > 0.5 ? -1 : 1) : 0;
      const coinY = type === 'jump' ? 2.5 : 0.8;
      for (let i = 0; i < 4; i++) {
        coins.current.push({
          id: ++coinIdCounter.current,
          lane: coinLane,
          z: zPos - 2 - i * 1.5,
          y: coinY,
          collected: false
        });
      }
    }
  };

  useFrame((state, delta) => {
    if (delta > 0.1) delta = 0.1; // cap

    if (gameState === 'menu' || gameState === 'startscreen') {
        // Idle camera sweep in menu
        const t = state.clock.getElapsedTime();
        camera.position.x = Math.sin(t * 0.5) * 5;
        camera.position.z = Math.cos(t * 0.5) * 5 + 8;
        camera.position.y = 4;
        camera.lookAt(0, 2, 0);
        return; // Don't move anything
    }

    if (isDead.current) {
      deathTimer.current += delta;
      if (monsterRef.current && playerRef.current) {
          monsterRef.current.position.z = THREE.MathUtils.lerp(monsterRef.current.position.z, playerRef.current.position.z, 5 * delta);
          monsterRef.current.position.x = THREE.MathUtils.lerp(monsterRef.current.position.x, playerRef.current.position.x, 5 * delta);
      }
      if (deathTimer.current > 1.5 && gameState === 'playing') {
          onGameOver();
      }
      return;
    }

    if (gameState !== 'playing') return;

    // dhire dhire badhana aur ek time jab tumhe lage ki ab speed jyada hai tab speed ko continuous kar dena
    setSpeed((s: number) => Math.min(s + delta * 0.25, 42)); // Gradually speed up, cap at 42

    const moveZ = speed * delta;
    worldZOffset.current -= moveZ;

    scoreCounter.current += moveZ * 0.15;
    if (Math.floor(scoreCounter.current) % 10 === 0) {
      onScore(Math.floor(scoreCounter.current));
    }

    if (obstacles.current.length === 0 || obstacles.current[obstacles.current.length - 1].z > worldZOffset.current - 80) {
      const lastZ = obstacles.current.length > 0 ? obstacles.current[obstacles.current.length - 1].z : worldZOffset.current - 20;
      // Spawn distance should be proportional to speed so players have time to react and land from jump
      const spawnDistance = Math.max(35, speed * 0.8 + 10) + Math.random() * 15;
      spawnObstacle(lastZ - spawnDistance);
    }

    if (playerRef.current) {
      const targetX = targetLane.current * LANE_WIDTH;
      playerRef.current.position.x = THREE.MathUtils.lerp(playerRef.current.position.x, targetX, 15 * delta);

      if (isJumping.current) {
        playerRef.current.position.y += velocityY.current * delta;
        velocityY.current -= 45 * delta;
        if (playerRef.current.position.y <= 0) {
          playerRef.current.position.y = 0;
          isJumping.current = false;
          velocityY.current = 0;
        }
      }

      if (isSliding.current) {
        slideTimer.current -= delta;
        if (slideTimer.current <= 0) {
          isSliding.current = false;
        }
      }

      const playerX = playerRef.current.position.x;
      const playerY = playerRef.current.position.y;
      const hitboxHeight = isSliding.current ? 0.8 : 2;

      // Smooth camera follow
      const targetCamX = playerX * 0.7;
      camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetCamX, 10 * delta);
      // Slight camera tilt/roll for realistic movement feel
      camera.rotation.z = THREE.MathUtils.lerp(camera.rotation.z, -playerX * 0.03, 10 * delta);
      // Look lower (-1 instead of 2) to move character up on screen
      camera.lookAt(camera.position.x, -1, -15);
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, 4 + playerY * 0.3, 15 * delta);
      camera.position.z = THREE.MathUtils.lerp(camera.position.z, 7.5, 15 * delta);

      for (let i = obstacles.current.length - 1; i >= 0; i--) {
        const obs = obstacles.current[i];
        const obsZWorld = obs.z - worldZOffset.current;
        const obsX = obs.lane * LANE_WIDTH;

        if (obsZWorld > 5) {
          obstacles.current.splice(i, 1);
          continue;
        }

        if (obsZWorld < 0.5 && obsZWorld > -0.5) {
          if (obs.type === 'river' || Math.abs(playerX - obsX) < 1.0) {
            let hit = false;
            if (obs.type === 'block') {
              if (playerY < 2) hit = true; 
            } else if (obs.type === 'jump') {
              if (playerY < 1.0) hit = true;
            } else if (obs.type === 'slide') {
              if (playerY + hitboxHeight > 1.2) hit = true;
            } else if (obs.type === 'river') {
              if (playerY < 0.8) hit = true; // River requires jump
            }

            if (hit) {
              if (!isDead.current) {
                 sounds.playHit();
              }
              isDead.current = true;
            }
          }
        }
      }

      for (let i = coins.current.length - 1; i >= 0; i--) {
        const coin = coins.current[i];
        if (coin.collected) continue;

        const coinZWorld = coin.z - worldZOffset.current;
        const coinX = coin.lane * LANE_WIDTH;
        const coinY = coin.y;

        if (coinZWorld > 5) {
          coins.current.splice(i, 1);
          continue;
        }

        if (Math.abs(coinZWorld) < 1.0 && Math.abs(playerX - coinX) < 1.0 && Math.abs(playerY - (coinY - 0.5)) < 1.5) {
          coin.collected = true;
          sounds.playCoin();
          onCoin();
        }
      }
    }
  });

  return (
    <>
       <Ground offset={worldZOffset.current} />
       <group ref={playerRef} position={[0, 0, 0]}>
         <PlayerCharacter isJumping={isJumping.current} isSliding={isSliding.current} targetLane={targetLane.current} isDead={isDead.current} gameState={gameState} />
       </group>
       <group ref={monsterRef} position={[0, 0, 6]}>
         <MonsterCharacter isDead={isDead.current} gameState={gameState} />
       </group>
       {obstacles.current.map(obs => (
         <ObstacleMesh key={obs.id} data={obs} worldOffset={worldZOffset.current} />
       ))}
       {coins.current.map(coin => !coin.collected && (
         <CoinMesh key={coin.id} data={coin} worldOffset={worldZOffset.current} />
       ))}
    </>
  );
}

// Improved Custom 3D Character
function PlayerCharacter({ isJumping, isSliding, targetLane, isDead, gameState }: { isJumping: boolean, isSliding: boolean, targetLane: number, isDead: boolean, gameState: string }) {
  const groupRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();
    const runSpeed = 22; // leg movement speed

    if (gameState === 'menu' || gameState === 'startscreen' || (gameState === 'gameover' && !isDead)) {
      // Idle breathing
      if (groupRef.current) {
        groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, Math.sin(time * 2) * 0.05, 5 * delta);
        groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0, 5 * delta);
      }
      if (leftLegRef.current) leftLegRef.current.rotation.x = THREE.MathUtils.lerp(leftLegRef.current.rotation.x, 0, 5 * delta);
      if (rightLegRef.current) rightLegRef.current.rotation.x = THREE.MathUtils.lerp(rightLegRef.current.rotation.x, 0, 5 * delta);
      if (leftArmRef.current) leftArmRef.current.rotation.x = THREE.MathUtils.lerp(leftArmRef.current.rotation.x, Math.sin(time * 2) * 0.1, 5 * delta);
      if (rightArmRef.current) rightArmRef.current.rotation.x = THREE.MathUtils.lerp(rightArmRef.current.rotation.x, -Math.sin(time * 2) * 0.1, 5 * delta);
      return;
    }

    if (groupRef.current) {
        if (isDead) {
            groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, -Math.PI / 2, 8 * delta);
            groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, -0.8, 8 * delta);
        } else if (isSliding) {
            groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, -0.6, 15 * delta);
            groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, -Math.PI / 2.5, 15 * delta);
        } else {
            groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, 0.4, 20 * delta);
            groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0.2, 10 * delta);
        }
    }

    if (isDead) return;

    if (!isJumping && !isSliding) {
      if (leftLegRef.current) leftLegRef.current.rotation.x = Math.sin(time * runSpeed) * 0.8;
      if (rightLegRef.current) rightLegRef.current.rotation.x = Math.sin(time * runSpeed + Math.PI) * 0.8;
      if (leftArmRef.current) leftArmRef.current.rotation.x = Math.sin(time * runSpeed + Math.PI) * 0.8;
      if (rightArmRef.current) rightArmRef.current.rotation.x = Math.sin(time * runSpeed) * 0.8;
    } else if (isJumping) {
      if (leftLegRef.current) leftLegRef.current.rotation.x = -0.5;
      if (rightLegRef.current) rightLegRef.current.rotation.x = 0.5;
      if (leftArmRef.current) leftArmRef.current.rotation.x = -Math.PI;
      if (rightArmRef.current) rightArmRef.current.rotation.x = Math.PI; // adjusted jump arms
    } else if (isSliding) {
      if (leftLegRef.current) leftLegRef.current.rotation.x = -Math.PI / 2;
      if (rightLegRef.current) rightLegRef.current.rotation.x = -Math.PI / 2;
      if (leftArmRef.current) leftArmRef.current.rotation.x = Math.PI / 2;
      if (rightArmRef.current) rightArmRef.current.rotation.x = Math.PI / 2;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Head */}
      <mesh position={[0, 1.8, 0]} castShadow>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial color="#fca5a5" roughness={0.4} />
      </mesh>

      {/* Explorer Hat */}
      <mesh position={[0, 2.05, 0]} castShadow>
        <cylinderGeometry args={[0.35, 0.45, 0.1, 16]} />
        <meshStandardMaterial color="#78350f" roughness={0.9} />
      </mesh>
      <mesh position={[0, 2.15, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.2, 0.2, 16]} />
        <meshStandardMaterial color="#78350f" roughness={0.9} />
      </mesh>
      
      {/* Backpack */}
      <mesh position={[0, 1.1, -0.3]} castShadow>
        <boxGeometry args={[0.5, 0.7, 0.3]} />
        <meshStandardMaterial color="#451a03" roughness={0.8} />
      </mesh>

      {/* Body Cylinder (Khaki Shirt) */}
      <mesh position={[0, 1.1, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.3, 0.9, 16]} />
        <meshStandardMaterial color="#d4d4d8" roughness={0.8} />
      </mesh>

      {/* left arm */}
      <group ref={leftArmRef} position={[-0.4, 1.4, 0]}>
        <mesh position={[0, -0.4, 0]} castShadow>
          <cylinderGeometry args={[0.1, 0.1, 0.8, 8]} />
          <meshStandardMaterial color="#d4d4d8" roughness={0.8} />
        </mesh>
        {/* hand */ }
        <mesh position={[0, -0.85, 0]} castShadow>
          <sphereGeometry args={[0.12, 8, 8]} />
          <meshStandardMaterial color="#fca5a5" />
        </mesh>
      </group>
      {/* right arm */}
      <group ref={rightArmRef} position={[0.4, 1.4, 0]}>
        <mesh position={[0, -0.4, 0]} castShadow>
          <cylinderGeometry args={[0.1, 0.1, 0.8, 8]} />
          <meshStandardMaterial color="#d4d4d8" roughness={0.8} />
        </mesh>
        {/* hand */ }
        <mesh position={[0, -0.85, 0]} castShadow>
          <sphereGeometry args={[0.12, 8, 8]} />
          <meshStandardMaterial color="#fca5a5" />
        </mesh>
      </group>

      {/* left leg (Brown Pants) */}
      <group ref={leftLegRef} position={[-0.18, 0.6, 0]}>
        <mesh position={[0, -0.4, 0]} castShadow>
          <cylinderGeometry args={[0.14, 0.1, 0.8, 8]} />
          <meshStandardMaterial color="#422006" roughness={0.9} />
        </mesh>
        {/* shoe */}
        <mesh position={[0, -0.85, 0.1]} castShadow>
          <boxGeometry args={[0.15, 0.15, 0.25]} />
          <meshStandardMaterial color="#1c1917" />
        </mesh>
      </group>
      {/* right leg */}
      <group ref={rightLegRef} position={[0.18, 0.6, 0]}>
        <mesh position={[0, -0.4, 0]} castShadow>
          <cylinderGeometry args={[0.14, 0.1, 0.8, 8]} />
          <meshStandardMaterial color="#422006" roughness={0.9} />
        </mesh>
        {/* shoe */}
        <mesh position={[0, -0.85, 0.1]} castShadow>
          <boxGeometry args={[0.15, 0.15, 0.25]} />
          <meshStandardMaterial color="#1c1917" />
        </mesh>
      </group>
    </group>
  );
}

function MonsterCharacter({ isDead, gameState }: { isDead: boolean, gameState: string }) {
  const groupRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();
    const runSpeed = 24;

    if (gameState === 'menu' || gameState === 'startscreen' || gameState === 'gameover') {
       if (groupRef.current) {
          groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, 0.8 + Math.sin(time*1.5)*0.1, 5 * delta);
          groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0, 5 * delta);
       }
       if (leftLegRef.current) leftLegRef.current.rotation.x = THREE.MathUtils.lerp(leftLegRef.current.rotation.x, 0, 5 * delta);
       if (rightLegRef.current) rightLegRef.current.rotation.x = THREE.MathUtils.lerp(rightLegRef.current.rotation.x, 0, 5 * delta);
       if (leftArmRef.current) leftArmRef.current.rotation.x = THREE.MathUtils.lerp(leftArmRef.current.rotation.x, Math.sin(time)*0.1, 5 * delta);
       if (rightArmRef.current) rightArmRef.current.rotation.x = THREE.MathUtils.lerp(rightArmRef.current.rotation.x, -Math.sin(time)*0.1, 5 * delta);
       return;
    }

    if (groupRef.current) {
      if (isDead) { // leap onto player
         groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, 0.5, 5 * delta);
         groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, Math.PI / 4, 5 * delta);
      } else {
         groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, 1.0, 10 * delta);
         groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0.4, 10 * delta);
      }
    }

    if (isDead) {
      // Catching Animation
      if (leftArmRef.current) leftArmRef.current.rotation.x = -Math.PI / 2;
      if (rightArmRef.current) rightArmRef.current.rotation.x = -Math.PI / 2;
    } else {
      // Beast run
      if (leftLegRef.current) leftLegRef.current.rotation.x = Math.sin(time * runSpeed) * 1.2;
      if (rightLegRef.current) rightLegRef.current.rotation.x = Math.sin(time * runSpeed + Math.PI) * 1.2;
      if (leftArmRef.current) leftArmRef.current.rotation.x = Math.sin(time * runSpeed + Math.PI) * 1.2;
      if (rightArmRef.current) rightArmRef.current.rotation.x = Math.sin(time * runSpeed) * 1.2;
    }
  });

  return (
    <group ref={groupRef} scale={[1.4, 1.4, 1.4]}>
      {/* Head */}
      <mesh position={[0, 1.4, 0.4]} castShadow>
        <sphereGeometry args={[0.35, 16, 16]} />
        <meshStandardMaterial color="#111827" roughness={0.9} />
      </mesh>
      {/* Snout */}
      <mesh position={[0, 1.3, 0.6]} castShadow>
        <boxGeometry args={[0.3, 0.25, 0.4]} />
        <meshStandardMaterial color="#1f2937" roughness={0.9} />
      </mesh>
      
      {/* Glowing Eyes */}
      <mesh position={[-0.15, 1.45, 0.65]} castShadow>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={3} />
      </mesh>
      <mesh position={[0.15, 1.45, 0.65]} castShadow>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={3} />
      </mesh>
      
      {/* Ears */}
      <mesh position={[-0.3, 1.6, 0.3]} rotation={[0, 0, 0.5]} castShadow>
        <coneGeometry args={[0.1, 0.3, 8]} />
        <meshStandardMaterial color="#111827" />
      </mesh>
      <mesh position={[0.3, 1.6, 0.3]} rotation={[0, 0, -0.5]} castShadow>
        <coneGeometry args={[0.1, 0.3, 8]} />
        <meshStandardMaterial color="#111827" />
      </mesh>

      {/* Body */}
      <mesh position={[0, 0.8, 0.2]} castShadow rotation={[0.4, 0, 0]}>
        <cylinderGeometry args={[0.4, 0.3, 1.0, 16]} />
        <meshStandardMaterial color="#111827" roughness={1} />
      </mesh>

      <group ref={leftArmRef} position={[-0.5, 1.1, 0.3]}>
        <mesh position={[0, -0.4, 0]} castShadow>
          <cylinderGeometry args={[0.12, 0.1, 0.9, 8]} />
          <meshStandardMaterial color="#1f2937" />
        </mesh>
      </group>
      <group ref={rightArmRef} position={[0.5, 1.1, 0.3]}>
        <mesh position={[0, -0.4, 0]} castShadow>
          <cylinderGeometry args={[0.12, 0.1, 0.9, 8]} />
          <meshStandardMaterial color="#1f2937" />
        </mesh>
      </group>
      <group ref={leftLegRef} position={[-0.25, 0.5, 0]}>
        <mesh position={[0, -0.3, 0]} castShadow>
           <cylinderGeometry args={[0.15, 0.1, 0.7, 8]} />
          <meshStandardMaterial color="#1f2937" />
        </mesh>
      </group>
      <group ref={rightLegRef} position={[0.25, 0.5, 0]}>
        <mesh position={[0, -0.3, 0]} castShadow>
          <cylinderGeometry args={[0.15, 0.1, 0.7, 8]} />
          <meshStandardMaterial color="#1f2937" />
        </mesh>
      </group>
      
      {/* Tail */}
      <mesh position={[0, 0.5, -0.2]} rotation={[2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.02, 0.8, 8]} />
        <meshStandardMaterial color="#111827" />
      </mesh>
    </group>
  );
}

// Realistic Temple environment
function Ground({ offset }: { offset: number }) {
  const length = 300;
  
  return (
    <group>
      {/* Main road (Stone blocks) */}
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0, -100]} receiveShadow>
        <planeGeometry args={[12, length]} />
        <meshStandardMaterial color="#a8a29e" roughness={1.0} />
      </mesh>
      
      {/* Jungle Grass/Mud on sides */}
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[-12, -0.1, -100]} receiveShadow>
        <planeGeometry args={[12, length]} />
        <meshStandardMaterial color="#22c55e" roughness={0.8} />
      </mesh>
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[12, -0.1, -100]} receiveShadow>
        <planeGeometry args={[12, length]} />
        <meshStandardMaterial color="#22c55e" roughness={0.8} />
      </mesh>

      {/* Temple Columns & Trees on the sides creating a corridor feel */}
      {Array.from({length: 30}).map((_, i) => {
        const z = -((offset + i * 15) % length);
        const isTree = i % 2 !== 0;

        return (
          <group key={i} position={[-5.5, 0, z]}>
            {isTree ? (
              <group position={[0, 0, 0]}>
                 <mesh position={[0, 3, 0]} castShadow>
                   <cylinderGeometry args={[0.5, 0.8, 6]} />
                   <meshStandardMaterial color="#451a03" />
                 </mesh>
                 <mesh position={[0, 7, 0]}>
                   <sphereGeometry args={[3, 8, 8]} />
                   <meshStandardMaterial color="#15803d" />
                 </mesh>
                 <mesh position={[-1, 6, 1]}>
                   <sphereGeometry args={[2.5, 8, 8]} />
                   <meshStandardMaterial color="#16a34a" />
                 </mesh>
              </group>
            ) : (
              <group>
                <mesh position={[0, 2, 0]} castShadow receiveShadow>
                  <boxGeometry args={[1.5, 4, 1.5]} />
                  <meshStandardMaterial color="#d6d3d1" roughness={1} />
                </mesh>
                <mesh position={[0, 4.5, 0]} castShadow>
                   <boxGeometry args={[2, 1, 2]} />
                   <meshStandardMaterial color="#a8a29e" />
                </mesh>
                <mesh position={[0.8, 2, 0]}>
                   <boxGeometry args={[0.3, 4, 0.3]} />
                   <meshStandardMaterial color="#16a34a" />
                </mesh>
              </group>
            )}
          </group>
        )
      })}
      
      {Array.from({length: 30}).map((_, i) => {
        const z = -((offset + i * 15) % length);
        const isTree = i % 2 === 0;

        return (
          <group key={'r'+i} position={[5.5, 0, z]}>
            {isTree ? (
              <group position={[0, 0, 0]}>
                 <mesh position={[0, 3, 0]} castShadow>
                   <cylinderGeometry args={[0.6, 0.9, 6]} />
                   <meshStandardMaterial color="#451a03" />
                 </mesh>
                 <mesh position={[0, 7, 0]}>
                   <sphereGeometry args={[3, 8, 8]} />
                   <meshStandardMaterial color="#15803d" />
                 </mesh>
                 <mesh position={[1, 6.5, -1]}>
                   <sphereGeometry args={[2, 8, 8]} />
                   <meshStandardMaterial color="#16a34a" />
                 </mesh>
              </group>
            ) : (
              <group>
                <mesh position={[0, 2, 0]} castShadow receiveShadow>
                  <boxGeometry args={[1.5, 4, 1.5]} />
                  <meshStandardMaterial color="#d6d3d1" roughness={1} />
                </mesh>
                <mesh position={[0, 4.5, 0]} castShadow>
                   <boxGeometry args={[2, 1, 2]} />
                   <meshStandardMaterial color="#a8a29e" />
                </mesh>
                {i % 4 === 0 && (
                    <mesh position={[-0.5, 0.5, 1.5]} rotation={[0.4, 0.2, 0]} castShadow>
                        <boxGeometry args={[1.5, 3, 1.5]} />
                        <meshStandardMaterial color="#d6d3d1" />
                    </mesh>
                )}
              </group>
            )}
          </group>
        )
      })}
    </group>
  );
}

function ObstacleMesh({ data, worldOffset }: { data: Obstacle, worldOffset: number }) {
  const zPos = data.z - worldOffset;
  const xPos = data.lane * LANE_WIDTH;

  if (data.type === 'jump') {
     // Fallen pillar or large tree root
     return (
       <mesh position={[xPos, 0.5, zPos]} castShadow receiveShadow rotation={[0, 0.1, 0]}>
         <boxGeometry args={[2.8, 1.2, 1.2]} />
         <meshStandardMaterial color="#78716c" roughness={1.0} />
       </mesh>
     );
  } else if (data.type === 'slide') {
     // Ancient ruin arch / bridge 
     return (
       <group position={[xPos, 0, zPos]}>
         <mesh position={[-0.8, 1, 0]} castShadow>
           <boxGeometry args={[0.5, 2, 0.8]} />
           <meshStandardMaterial color="#78716c" />
         </mesh>
         <mesh position={[0.8, 1, 0]} castShadow>
           <boxGeometry args={[0.5, 2, 0.8]} />
           <meshStandardMaterial color="#78716c" />
         </mesh>
         {/* Top overhang */}
         <mesh position={[0, 2.5, 0]} castShadow receiveShadow>
           <boxGeometry args={[3, 1, 1]} />
           <meshStandardMaterial color="#78716c" />
         </mesh>
       </group>
     );
  } else if (data.type === 'river') {
     // A raging river blocking all lanes
     return (
       <group position={[0, -0.2, zPos]}>
         <mesh castShadow receiveShadow>
           <boxGeometry args={[12, 0.4, 3.5]} />
           <meshStandardMaterial color="#0284c7" transparent opacity={0.9} roughness={0.1} />
         </mesh>
         <mesh position={[0, 0.4, -1.8]} receiveShadow>
           <boxGeometry args={[12, 0.8, 0.5]} />
           <meshStandardMaterial color="#78716c" roughness={1.0} />
         </mesh>
         <mesh position={[0, 0.4, 1.8]} receiveShadow>
           <boxGeometry args={[12, 0.8, 0.5]} />
           <meshStandardMaterial color="#78716c" roughness={1.0} />
         </mesh>
       </group>
     );
  } else {
     // Large pile of stones / barrier
     return (
       <mesh position={[xPos, 1.5, zPos]} castShadow receiveShadow>
         <boxGeometry args={[2.5, 3, 1.2]} />
         <meshStandardMaterial color="#57534e" roughness={0.9} />
       </mesh>
     );
  }
}

function CoinMesh({ data, worldOffset }: { data: Coin, worldOffset: number }) {
  const zPos = data.z - worldOffset;
  const xPos = data.lane * LANE_WIDTH;
  const ref = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (ref.current) {
      ref.current.rotation.y += 3 * delta; // rotate smoothly based on time
    }
  });

  return (
    <mesh ref={ref} position={[xPos, data.y, zPos]} castShadow rotation={[Math.PI/2, 0, 0]}>
      <cylinderGeometry args={[0.4, 0.4, 0.1, 16]} />
      <meshStandardMaterial color="#fbbf24" metalness={0.8} roughness={0.2} emissive="#f59e0b" emissiveIntensity={0.3} />
    </mesh>
  );
}
