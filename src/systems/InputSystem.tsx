// This file processes user input for the game

// InputSystem class for use in the game engine
class InputSystem {
  private keys: { [key: string]: boolean } = {
    w: false,
    a: false,
    s: false,
    d: false,
    ' ': false, // space bar for shooting
    e: false,   // e key for melee attack
    r: false,   // r key for reloading
  };
  
  // Mobile inputs
  private moveJoystick: { x: number, y: number } = { x: 0, y: 0 }; // Movement joystick
  private aimJoystick: { x: number, y: number } = { x: 0, y: 0 };  // Aiming joystick
  private mobileButtons: { [key: string]: boolean } = {
    melee: false,
    reload: false
  };
  private isMobileInput: boolean = false;
  private lastUpdateTime: number = 0;
  private isAimActive: boolean = false; // Track if aim joystick is being used
  private isShootingActive: boolean = false;  // Track if player is shooting

  constructor() {
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
    window.addEventListener('keyup', this.handleKeyUp.bind(this));
    
    // Detect if mobile device and set flag
    this.isMobileInput = this.detectMobile();
    this.lastUpdateTime = performance.now();
  }
  
  /**
   * Update method called each frame to process input
   */
  public update(): void {
    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastUpdateTime) / 1000;
    this.lastUpdateTime = currentTime;
    
    // Process any continuous input logic here
    // For example, handling long presses or input smoothing
    
    // For now, this is a placeholder for future input processing
  }
  
  /**
   * Detect if the user is on a mobile device
   */
  private detectMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }
  
  private handleKeyDown(e: KeyboardEvent): void {
    if (e.key.toLowerCase() in this.keys) {
      this.keys[e.key.toLowerCase()] = true;
    }
  }
  
  private handleKeyUp(e: KeyboardEvent): void {
    if (e.key.toLowerCase() in this.keys) {
      this.keys[e.key.toLowerCase()] = false;
    }
  }
  
  /**
   * Set movement joystick input values from mobile controls
   * @param x Normalized x-axis value (-1 to 1)
   * @param y Normalized y-axis value (-1 to 1)
   */
  public setMoveJoystickInput(x: number, y: number): void {
    this.moveJoystick.x = x;
    this.moveJoystick.y = y;
    
    // Convert joystick values to key presses for compatibility
    // This way we don't need to modify the movement system
    this.keys['a'] = x < -0.2;
    this.keys['d'] = x > 0.2;
    this.keys['w'] = y < -0.2;
    this.keys['s'] = y > 0.2;
  }
  
  /**
   * Set aim joystick input values from mobile controls
   * @param x Normalized x-axis value (-1 to 1)
   * @param y Normalized y-axis value (-1 to 1)
   * @param isActive Whether the joystick is being used
   */
  public setAimJoystickInput(x: number, y: number, isActive: boolean): void {
    this.aimJoystick.x = x;
    this.aimJoystick.y = y;
    this.isAimActive = isActive;
    
    // If joystick is active and has meaningful input, set shooting intent to true
    // The actual shooting will be controlled by the cooldown in GameEngine
    const hasInput = Math.abs(x) > 0.2 || Math.abs(y) > 0.2;
    this.isShootingActive = isActive && hasInput;
  }
  
  /**
   * Set mobile button state
   * @param button Button identifier
   * @param pressed Whether the button is pressed
   */
  public setMobileButtonInput(button: string, pressed: boolean): void {
    if (button === 'melee') {
      this.mobileButtons.melee = pressed;
      // Map to e key for compatibility
      this.keys['e'] = pressed;
    } else if (button === 'reload') {
      this.mobileButtons.reload = pressed;
      // Map to r key for compatibility
      this.keys['r'] = pressed;
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
   * Get movement joystick input values
   * Useful for direct analog movement
   */
  public getMoveJoystickInput(): { x: number, y: number } {
    return { ...this.moveJoystick };
  }
  
  /**
   * Get aim joystick input values
   * Used for aiming and shooting direction
   */
  public getAimJoystickInput(): { x: number, y: number, isActive: boolean } {
    return { 
      x: this.aimJoystick.x, 
      y: this.aimJoystick.y,
      isActive: this.isAimActive
    };
  }
  
  /**
   * Check if player is intending to shoot
   * Note: The actual shooting will be controlled by the cooldown in GameEngine
   */
  public isShooting(): boolean {
    return this.isShootingActive || this.keys[' '];
  }
  
  /**
   * Check if device is mobile
   */
  public isMobile(): boolean {
    return this.isMobileInput;
  }
  
  /**
   * Clean up event listeners
   */
  public cleanup(): void {
    window.removeEventListener('keydown', this.handleKeyDown.bind(this));
    window.removeEventListener('keyup', this.handleKeyUp.bind(this));
  }
}

export default InputSystem;