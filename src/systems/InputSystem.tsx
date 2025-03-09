// This file processes user input for the game
import { useEffect, useRef } from 'react';

// React hook for handling input in React components
export const useInput = () => {
  const keys = useRef<{ [key: string]: boolean }>({ w: false, a: false, s: false, d: false });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key in keys.current) keys.current[e.key] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key in keys.current) keys.current[e.key] = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return keys;
};

// InputSystem class for use in the game engine
class InputSystem {
  private keys: { [key: string]: boolean } = {
    w: false,
    a: false,
    s: false,
    d: false,
    ' ': false, // space bar for shooting
  };

  constructor() {
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
    window.addEventListener('keyup', this.handleKeyUp.bind(this));
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.key in this.keys) {
      this.keys[e.key] = true;
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    if (e.key in this.keys) {
      this.keys[e.key] = false;
    }
  }

  public getInput(): { [key: string]: boolean } {
    return { ...this.keys };
  }

  public cleanup(): void {
    window.removeEventListener('keydown', this.handleKeyDown.bind(this));
    window.removeEventListener('keyup', this.handleKeyUp.bind(this));
  }
}

export default InputSystem;