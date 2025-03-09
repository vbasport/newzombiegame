import { Canvas } from '@react-three/fiber';
import { useRef } from 'react';
import Player from './components/Player';
import Zombie from './components/Zombie';
import GameEngine from './components/GameEngine';
import { SocketProvider } from './systems/NetworkSystem';

function App() {
  const playerRef = useRef<THREE.Mesh>(null!);

  return (
    <SocketProvider>
      <Canvas camera={{ position: [0, 20, 0], fov: 75 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <Player ref={playerRef} />
        <Zombie />
        <GameEngine playerRef={playerRef} />
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[50, 50]} />
          <meshStandardMaterial color={0x228B22} />
        </mesh>
      </Canvas>
    </SocketProvider>
  );
}

export default App;