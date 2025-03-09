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
  
  // Mobile inputs
  private mobileJoystick: { x: number, y: number } = { x: 0, y: 0 };
  private mobileButtons: { [key: string]: boolean } = {
    shoot: false
  };
  private isMobileInput: boolean = false;

  constructor() {
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
    window.addEventListener('keyup', this.handleKeyUp.bind(this));
    
    // Detect if mobile device and set flag
    this.isMobileInput = this.detectMobile();
  }
  
  private detectMobile(): boolean {
    return (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      (window.innerWidth <= 800 && window.innerHeight <= 600)
    );
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
  
  /**
   * Set joystick input values from mobile controls
   * @param x Normalized x-axis value (-1 to 1)
   * @param y Normalized y-axis value (-1 to 1)
   */
  public setMobileJoystickInput(x: number, y: number): void {
    this.mobileJoystick.x = x;
    this.mobileJoystick.y = y;
    
    // Convert joystick values to key presses for compatibility
    // This way we don't need to modify the movement system
    this.keys['a'] = x < -0.2;
    this.keys['d'] = x > 0.2;
    this.keys['w'] = y < -0.2;
    this.keys['s'] = y > 0.2;
  }
  
  /**
   * Set mobile button state
   * @param button Button identifier
   * @param pressed Whether the button is pressed
   */
  public setMobileButtonInput(button: string, pressed: boolean): void {
    if (button === 'shoot') {
      this.mobileButtons.shoot = pressed;
      // Map to spacebar for compatibility
      this.keys[' '] = pressed;
    }
  }

  /**
   * Get the current input state
   * Returns keyboard or mobile input depending on device
   */
  public getInput(): { [key: string]: boolean } {
    return { ...this.keys };
  }
  
  /**
   * Get raw joystick input values
   * Useful for direct analog movement
   */
  public getJoystickInput(): { x: number, y: number } {
    return { ...this.mobileJoystick };
  }
  
  /**
   * Returns if the system is using mobile input
   */
  public isMobile(): boolean {
    return this.isMobileInput;
  }

  public cleanup(): void {
    window.removeEventListener('keydown', this.handleKeyDown.bind(this));
    window.removeEventListener('keyup', this.handleKeyUp.bind(this));
  }
}

export default InputSystem;