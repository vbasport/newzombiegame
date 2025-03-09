import { useEffect, useRef } from 'react';
import GameEngine from './components/GameEngine';
import './App.css';

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    if (!canvasRef.current) return;
    
    // Initialize the game engine with the canvas
    const gameEngine = new GameEngine();
    gameEngine.start();
    
    // Cleanup on unmount
    return () => {
      gameEngine.stop();
    };
  }, []);
  
  return (
    <div className="game-container">
      <canvas 
        ref={canvasRef}
        style={{ 
          width: '100%', 
          height: '100vh', 
          display: 'block' 
        }}
      />
    </div>
  );
}

export default App;