import RenderingSystem from '../systems/RenderingSystem';
import InputSystem from '../systems/InputSystem';
import UISystem from '../systems/UISystem';
import NetworkSystem from '../systems/NetworkSystem';
import Player from './Player';
import Zombie from './Zombie';
import * as THREE from 'three';

class GameEngine {
  private renderingSystem: RenderingSystem;
  private inputSystem: InputSystem;
  private uiSystem: UISystem;
  private networkSystem: NetworkSystem;
  private player: Player;
  private playerName: string;
  private zombies: Zombie[] = [];
  private lastTime: number = 0;
  private zombieSpawnTime: number = 0;
  private initialZombieSpawnRate: number = 5; // Initial time between spawns in seconds
  private zombieSpawnRate: number = 5; // Current spawn rate (will decrease over time)
  private maxZombies: number = 200; // Increased to allow many more zombies on screen
  private difficultyScalingFactor: number = 0.92; // How quickly difficulty increases (< 1.0) - made more aggressive
  private difficultyIncreaseInterval: number = 10; // Seconds between difficulty increases
  private timeSinceLastDifficultyIncrease: number = 0;
  private minSpawnRate: number = 0.3; // Fastest possible spawn rate (seconds) - made faster
  private waveNumber: number = 1; // Track the current wave number
  private gameScore: number = 0;
  private _gameOver: boolean = false; // Renamed with underscore to indicate private usage
  private debugMode: boolean = false; // For testing and debugging
  private respawnCountdown: number = 0; // Respawn timer in seconds
  private respawnTime: number = 5; // Reduced from 10 to 5 seconds
  private playerDead: boolean = false; // Track if player is currently dead
  private scoreboardElement: HTMLElement | null = null; // Scoreboard DOM element
  private mobileControlsElement: HTMLElement | null = null; // Mobile controls DOM element
  private isMobile: boolean = false; // Detect if using mobile device
  private waveIndicatorElement: HTMLElement | null = null; // Wave indicator element
  private lastMeleeTime: number = 0; // Track when the last melee attack was performed
  private meleeCooldown: number = 1.5; // Cooldown time in seconds between melee attacks
  private meleeRange: number = 3; // Range of melee attack in units
  private meleeKnockback: number = 20; // How far zombies are knocked back by melee - increased to 20
  private meleeCooldownIndicator: HTMLElement | null = null; // Visual indicator for melee cooldown
  private lastShootTime: number = 0; // Track when the last shot was fired
  private shootCooldownIndicator: HTMLElement | null = null; // Visual indicator for shoot cooldown
  private zombieCleanupInterval: number = 2; // How often to check for dead zombies (seconds)
  private lastZombieCleanupTime: number = 0; // Last time zombies were cleaned up

  constructor(playerName: string = 'Player') {
    this.playerName = playerName;
    this.renderingSystem = new RenderingSystem();
    this.inputSystem = new InputSystem();
    this.uiSystem = new UISystem(this.renderingSystem.getScene());
    this.networkSystem = new NetworkSystem(this.playerName);
    this.isMobile = this.detectMobile();
    this.player = new Player(this.playerName);
    this.renderingSystem.addToScene(this.player.getMesh());
    this.uiSystem.createHealthBar(this.player, true);
    
    // Initialize time trackers
    this.lastTime = performance.now();
    this.lastZombieCleanupTime = performance.now() / 1000;
    
    // Create unified UI container first
    this.createUnifiedUI();
    
    // Setup melee cooldown UI
    this.setupUI();
    
    if (this.isMobile) {
      this.createMobileControls();
    }
    this.spawnInitialZombies(3);
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
    window.addEventListener('resize', this.handleWindowResize.bind(this));
    
    // Set up network event listeners
    this.setupNetworkListeners();
    
    console.log(`Game engine initialized with player name: ${this.playerName}`);
    console.log('Mobile device detected:', this.isMobile);
  }

  private detectMobile(): boolean {
    return (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      (window.innerWidth <= 800 && window.innerHeight <= 600)
    );
  }

  private handleWindowResize(): void {
    // Update UI positions when window is resized
    if (this.isMobile && this.mobileControlsElement) {
      this.updateMobileControlsPosition();
    }
  }

  private createMobileControls(): void {
    // Create container for mobile controls
    this.mobileControlsElement = document.createElement('div');
    this.mobileControlsElement.id = 'mobile-controls';
    this.mobileControlsElement.style.position = 'fixed';
    this.mobileControlsElement.style.bottom = '0';
    this.mobileControlsElement.style.left = '0';
    this.mobileControlsElement.style.width = '100%';
    this.mobileControlsElement.style.height = '30%';
    this.mobileControlsElement.style.display = 'flex';
    this.mobileControlsElement.style.justifyContent = 'space-between';
    this.mobileControlsElement.style.alignItems = 'center';
    this.mobileControlsElement.style.pointerEvents = 'none';
    this.mobileControlsElement.style.zIndex = '1000';
    document.body.appendChild(this.mobileControlsElement);
    
    // Create left joystick container (movement)
    const leftJoystickContainer = document.createElement('div');
    leftJoystickContainer.id = 'left-joystick-container';
    leftJoystickContainer.style.position = 'relative';
    leftJoystickContainer.style.width = '120px';
    leftJoystickContainer.style.height = '120px';
    leftJoystickContainer.style.borderRadius = '50%';
    leftJoystickContainer.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
    leftJoystickContainer.style.margin = '0 0 20px 20px';
    leftJoystickContainer.style.pointerEvents = 'auto';
    leftJoystickContainer.style.touchAction = 'none';
    this.mobileControlsElement.appendChild(leftJoystickContainer);
    
    // Create joystick knob for left joystick
    const leftJoystickKnob = document.createElement('div');
    leftJoystickKnob.id = 'left-joystick-knob';
    leftJoystickKnob.style.position = 'absolute';
    leftJoystickKnob.style.top = '50%';
    leftJoystickKnob.style.left = '50%';
    leftJoystickKnob.style.width = '50px';
    leftJoystickKnob.style.height = '50px';
    leftJoystickKnob.style.borderRadius = '50%';
    leftJoystickKnob.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
    leftJoystickKnob.style.transform = 'translate(-50%, -50%)';
    leftJoystickKnob.style.pointerEvents = 'none';
    leftJoystickContainer.appendChild(leftJoystickKnob);
    
    // Create center container for melee button
    const centerContainer = document.createElement('div');
    centerContainer.style.display = 'flex';
    centerContainer.style.flexDirection = 'column';
    centerContainer.style.alignItems = 'center';
    centerContainer.style.justifyContent = 'center';
    centerContainer.style.pointerEvents = 'none';
    this.mobileControlsElement.appendChild(centerContainer);
    
    // Create melee button in center
    const meleeButton = document.createElement('div');
    meleeButton.id = 'melee-button';
    meleeButton.className = 'mobile-button';
    meleeButton.innerHTML = 'MELEE';
    meleeButton.style.position = 'relative';
    meleeButton.style.width = '80px';
    meleeButton.style.height = '80px';
    meleeButton.style.backgroundColor = 'rgba(255, 100, 0, 0.5)';
    meleeButton.style.borderRadius = '50%';
    meleeButton.style.display = 'flex';
    meleeButton.style.justifyContent = 'center';
    meleeButton.style.alignItems = 'center';
    meleeButton.style.color = 'white';
    meleeButton.style.fontWeight = 'bold';
    meleeButton.style.userSelect = 'none';
    meleeButton.style.touchAction = 'manipulation';
    meleeButton.style.pointerEvents = 'auto';
    meleeButton.style.marginBottom = '20px';
    centerContainer.appendChild(meleeButton);
    
    // Create reload button below melee button
    const reloadButton = document.createElement('div');
    reloadButton.id = 'reload-button';
    reloadButton.className = 'mobile-button';
    reloadButton.innerHTML = 'RELOAD';
    reloadButton.style.position = 'relative';
    reloadButton.style.width = '70px';
    reloadButton.style.height = '40px';
    reloadButton.style.backgroundColor = 'rgba(50, 150, 255, 0.5)';
    reloadButton.style.borderRadius = '10px';
    reloadButton.style.display = 'flex';
    reloadButton.style.justifyContent = 'center';
    reloadButton.style.alignItems = 'center';
    reloadButton.style.color = 'white';
    reloadButton.style.fontWeight = 'bold';
    reloadButton.style.userSelect = 'none';
    reloadButton.style.touchAction = 'manipulation';
    reloadButton.style.pointerEvents = 'auto';
    centerContainer.appendChild(reloadButton);
    
    // Create right joystick container (aiming/shooting)
    const rightJoystickContainer = document.createElement('div');
    rightJoystickContainer.id = 'right-joystick-container';
    rightJoystickContainer.style.position = 'relative';
    rightJoystickContainer.style.width = '120px';
    rightJoystickContainer.style.height = '120px';
    rightJoystickContainer.style.borderRadius = '50%';
    rightJoystickContainer.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
    rightJoystickContainer.style.margin = '0 20px 20px 0';
    rightJoystickContainer.style.pointerEvents = 'auto';
    rightJoystickContainer.style.touchAction = 'none';
    this.mobileControlsElement.appendChild(rightJoystickContainer);
    
    // Create joystick knob for right joystick
    const rightJoystickKnob = document.createElement('div');
    rightJoystickKnob.id = 'right-joystick-knob';
    rightJoystickKnob.style.position = 'absolute';
    rightJoystickKnob.style.top = '50%';
    rightJoystickKnob.style.left = '50%';
    rightJoystickKnob.style.width = '50px';
    rightJoystickKnob.style.height = '50px';
    rightJoystickKnob.style.borderRadius = '50%';
    rightJoystickKnob.style.backgroundColor = 'rgba(255, 100, 100, 0.5)';
    rightJoystickKnob.style.transform = 'translate(-50%, -50%)';
    rightJoystickKnob.style.pointerEvents = 'none';
    rightJoystickContainer.appendChild(rightJoystickKnob);
    
    // Set up event listeners for both joysticks and melee button
    this.setupMobileControlsEvents(leftJoystickContainer, rightJoystickContainer, meleeButton, reloadButton);
  }
  
  private setupMobileControlsEvents(
    moveJoystickContainer: HTMLElement, 
    aimJoystickContainer: HTMLElement, 
    meleeButton: HTMLElement,
    reloadButton: HTMLElement
  ): void {
    // Movement joystick variables
    let isMoveJoystickActive = false;
    let moveJoystickOrigin = { x: 0, y: 0 };
    const leftKnob = document.getElementById('left-joystick-knob');
    const moveJoystickMaxDistance = 40; // Max distance the joystick can move
    let moveJoystickTouchId: number | null = null; // Track the touch identifier for movement joystick
    
    // Aim joystick variables
    let isAimJoystickActive = false;
    let aimJoystickOrigin = { x: 0, y: 0 };
    const rightKnob = document.getElementById('right-joystick-knob');
    const aimJoystickMaxDistance = 40; // Max distance the joystick can move
    let aimJoystickTouchId: number | null = null; // Track the touch identifier for aim joystick
    
    // Add a helper function to find a touch by its identifier
    const findTouchById = (touches: TouchList, id: number): Touch | undefined => {
      for (let i = 0; i < touches.length; i++) {
        if (touches[i].identifier === id) {
          return touches[i];
        }
      }
      return undefined;
    };
    
    // Movement joystick touch events
    moveJoystickContainer.addEventListener('touchstart', (e) => {
      // If this joystick is already active with another touch, ignore new touches
      if (isMoveJoystickActive) return;
      
      const touch = e.changedTouches[0]; // Get the first new touch
      moveJoystickTouchId = touch.identifier; // Store the touch identifier
      isMoveJoystickActive = true;
      
      const rect = moveJoystickContainer.getBoundingClientRect();
      moveJoystickOrigin.x = touch.clientX - rect.left;
      moveJoystickOrigin.y = touch.clientY - rect.top;
      
      // Set knob position
      if (leftKnob) {
        leftKnob.style.left = `${moveJoystickOrigin.x}px`;
        leftKnob.style.top = `${moveJoystickOrigin.y}px`;
        leftKnob.style.transform = 'translate(-50%, -50%)';
      }
      
      e.preventDefault();
    });
    
    moveJoystickContainer.addEventListener('touchmove', (e) => {
      if (!isMoveJoystickActive || !leftKnob || moveJoystickTouchId === null) return;
      
      // Find the touch with the matching identifier from all active touches
      const touch = findTouchById(e.touches, moveJoystickTouchId);
      
      // If we couldn't find the touch, return
      if (!touch) return;
      
      const rect = moveJoystickContainer.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      
      // Calculate direction vector
      let dx = x - moveJoystickOrigin.x;
      let dy = y - moveJoystickOrigin.y;
      
      // Normalize if exceeds max distance
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > moveJoystickMaxDistance) {
        dx = dx / distance * moveJoystickMaxDistance;
        dy = dy / distance * moveJoystickMaxDistance;
      }
      
      // Update knob position
      leftKnob.style.left = `${moveJoystickOrigin.x + dx}px`;
      leftKnob.style.top = `${moveJoystickOrigin.y + dy}px`;
      
      // Update input system with normalized direction
      const normalizedDx = dx / moveJoystickMaxDistance;
      const normalizedDy = dy / moveJoystickMaxDistance;
      this.inputSystem.setMoveJoystickInput(normalizedDx, normalizedDy);
      
      e.preventDefault();
    });
    
    moveJoystickContainer.addEventListener('touchend', (e) => {
      // Find the touch with the matching identifier
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === moveJoystickTouchId) {
          isMoveJoystickActive = false;
          moveJoystickTouchId = null;
          
          // Reset knob position
          if (leftKnob) {
            leftKnob.style.left = '50%';
            leftKnob.style.top = '50%';
            leftKnob.style.transform = 'translate(-50%, -50%)';
          }
          
          // Reset input
          this.inputSystem.setMoveJoystickInput(0, 0);
          break;
        }
      }
      
      e.preventDefault();
    });
    
    moveJoystickContainer.addEventListener('touchcancel', (e) => {
      // Find the touch with the matching identifier
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === moveJoystickTouchId) {
          isMoveJoystickActive = false;
          moveJoystickTouchId = null;
          
          // Reset knob position
          if (leftKnob) {
            leftKnob.style.left = '50%';
            leftKnob.style.top = '50%';
            leftKnob.style.transform = 'translate(-50%, -50%)';
          }
          
          // Reset input
          this.inputSystem.setMoveJoystickInput(0, 0);
          break;
        }
      }
      
      e.preventDefault();
    });
    
    // Aim joystick touch events
    aimJoystickContainer.addEventListener('touchstart', (e) => {
      // If this joystick is already active with another touch, ignore new touches
      if (isAimJoystickActive) return;
      
      const touch = e.changedTouches[0]; // Get the first new touch
      aimJoystickTouchId = touch.identifier; // Store the touch identifier
      isAimJoystickActive = true;
      
      const rect = aimJoystickContainer.getBoundingClientRect();
      aimJoystickOrigin.x = touch.clientX - rect.left;
      aimJoystickOrigin.y = touch.clientY - rect.top;
      
      // Set knob position
      if (rightKnob) {
        rightKnob.style.left = `${aimJoystickOrigin.x}px`;
        rightKnob.style.top = `${aimJoystickOrigin.y}px`;
        rightKnob.style.transform = 'translate(-50%, -50%)';
      }
      
      e.preventDefault();
    });
    
    aimJoystickContainer.addEventListener('touchmove', (e) => {
      if (!isAimJoystickActive || !rightKnob || aimJoystickTouchId === null) return;
      
      // Find the touch with the matching identifier from all active touches
      const touch = findTouchById(e.touches, aimJoystickTouchId);
      
      // If we couldn't find the touch, return
      if (!touch) return;
      
      const rect = aimJoystickContainer.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      
      // Calculate direction vector
      let dx = x - aimJoystickOrigin.x;
      let dy = y - aimJoystickOrigin.y;
      
      // Normalize if exceeds max distance
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > aimJoystickMaxDistance) {
        dx = dx / distance * aimJoystickMaxDistance;
        dy = dy / distance * aimJoystickMaxDistance;
      }
      
      // Update knob position
      rightKnob.style.left = `${aimJoystickOrigin.x + dx}px`;
      rightKnob.style.top = `${aimJoystickOrigin.y + dy}px`;
      
      // Update input system with normalized direction
      const normalizedDx = dx / aimJoystickMaxDistance;
      const normalizedDy = dy / aimJoystickMaxDistance;
      this.inputSystem.setAimJoystickInput(normalizedDx, normalizedDy, true);
      
      e.preventDefault();
    });
    
    aimJoystickContainer.addEventListener('touchend', (e) => {
      // Find the touch with the matching identifier
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === aimJoystickTouchId) {
          isAimJoystickActive = false;
          aimJoystickTouchId = null;
          
          // Reset knob position
          if (rightKnob) {
            rightKnob.style.left = '50%';
            rightKnob.style.top = '50%';
            rightKnob.style.transform = 'translate(-50%, -50%)';
          }
          
          // Reset input
          this.inputSystem.setAimJoystickInput(0, 0, false);
          break;
        }
      }
      
      e.preventDefault();
    });
    
    aimJoystickContainer.addEventListener('touchcancel', (e) => {
      // Find the touch with the matching identifier
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === aimJoystickTouchId) {
          isAimJoystickActive = false;
          aimJoystickTouchId = null;
          
          // Reset knob position
          if (rightKnob) {
            rightKnob.style.left = '50%';
            rightKnob.style.top = '50%';
            rightKnob.style.transform = 'translate(-50%, -50%)';
          }
          
          // Reset input
          this.inputSystem.setAimJoystickInput(0, 0, false);
          break;
        }
      }
      
      e.preventDefault();
    });
    
    // Melee button touch events
    let meleeTouchId: number | null = null;
    
    meleeButton.addEventListener('touchstart', (e) => {
      // If already pressed, ignore
      if (meleeTouchId !== null) return;
      
      const touch = e.changedTouches[0];
      meleeTouchId = touch.identifier;
      this.inputSystem.setMobileButtonInput('melee', true);
      e.preventDefault();
    });
    
    meleeButton.addEventListener('touchend', (e) => {
      // Find the touch with the matching identifier
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === meleeTouchId) {
          meleeTouchId = null;
          this.inputSystem.setMobileButtonInput('melee', false);
          break;
        }
      }
      e.preventDefault();
    });
    
    meleeButton.addEventListener('touchcancel', (e) => {
      // Find the touch with the matching identifier
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === meleeTouchId) {
          meleeTouchId = null;
          this.inputSystem.setMobileButtonInput('melee', false);
          break;
        }
      }
      e.preventDefault();
    });
    
    // Reload button touch events
    let reloadTouchId: number | null = null;
    
    reloadButton.addEventListener('touchstart', (e) => {
      // If already pressed, ignore
      if (reloadTouchId !== null) return;
      
      const touch = e.changedTouches[0];
      reloadTouchId = touch.identifier;
      this.inputSystem.setMobileButtonInput('reload', true);
      e.preventDefault();
    });
    
    reloadButton.addEventListener('touchend', (e) => {
      // Find the touch with the matching identifier
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === reloadTouchId) {
          reloadTouchId = null;
          this.inputSystem.setMobileButtonInput('reload', false);
          break;
        }
      }
      e.preventDefault();
    });
    
    reloadButton.addEventListener('touchcancel', (e) => {
      // Find the touch with the matching identifier
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === reloadTouchId) {
          reloadTouchId = null;
          this.inputSystem.setMobileButtonInput('reload', false);
          break;
        }
      }
      e.preventDefault();
    });
  }
  
  private updateMobileControlsPosition(): void {
    // Since we're using fixed positioning, we don't need to update the position
    // of the entire controls container anymore, as it will stay fixed to the bottom
    
    // We only need to ensure the controls are visible and properly sized
    if (!this.mobileControlsElement) return;
    
    // Make sure the controls are visible
    this.mobileControlsElement.style.display = 'flex';
  }

  /**
   * Create a unified UI container for all game status information
   */
  private createUnifiedUI(): void {
    // Create a container for all UI elements
    const uiContainer = document.createElement('div');
    uiContainer.id = 'game-ui-container';
    uiContainer.style.position = 'fixed';
    uiContainer.style.top = '5px';
    uiContainer.style.left = '5px';
    uiContainer.style.right = '5px';
    uiContainer.style.display = 'flex';
    uiContainer.style.justifyContent = 'space-between';
    uiContainer.style.alignItems = 'flex-start';
    uiContainer.style.pointerEvents = 'none';
    uiContainer.style.zIndex = '1000';
    
    // Create a single top bar for all stats
    const statsBar = document.createElement('div');
    statsBar.id = 'game-ui-stats-bar';
    statsBar.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    statsBar.style.borderRadius = '5px';
    statsBar.style.padding = '8px 15px';
    statsBar.style.color = 'white';
    statsBar.style.fontFamily = 'Arial, sans-serif';
    statsBar.style.fontSize = '14px';
    statsBar.style.width = '100%';
    statsBar.style.display = 'flex';
    statsBar.style.flexDirection = 'column';
    statsBar.style.gap = '8px';
    statsBar.style.pointerEvents = 'auto';
    statsBar.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.3)';
    
    // Create top row for player stats
    const playerStatsRow = document.createElement('div');
    playerStatsRow.id = 'game-ui-player-stats-row';
    playerStatsRow.style.display = 'flex';
    playerStatsRow.style.width = '100%';
    playerStatsRow.style.justifyContent = 'space-between';
    playerStatsRow.style.alignItems = 'center';
    
    // Create separator
    const separator = document.createElement('div');
    separator.style.width = '100%';
    separator.style.height = '1px';
    separator.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
    separator.style.margin = '0';
    
    // Create bottom row for game info
    const gameInfoRow = document.createElement('div');
    gameInfoRow.id = 'game-ui-game-info-row';
    gameInfoRow.style.display = 'flex';
    gameInfoRow.style.width = '100%';
    gameInfoRow.style.justifyContent = 'space-between';
    gameInfoRow.style.alignItems = 'center';
    
    // Create wave indicator
    this.createWaveIndicator(gameInfoRow);
    
    // Create ammo indicator
    this.createAmmoIndicator(gameInfoRow);
    
    // Add rows and separator to stats bar
    statsBar.appendChild(playerStatsRow);
    statsBar.appendChild(separator);
    statsBar.appendChild(gameInfoRow);
    
    // Create center panel for notifications (below the stats bar)
    const centerPanel = document.createElement('div');
    centerPanel.id = 'game-ui-center-panel';
    centerPanel.style.position = 'fixed';
    centerPanel.style.top = '80px';
    centerPanel.style.left = '0';
    centerPanel.style.right = '0';
    centerPanel.style.display = 'flex';
    centerPanel.style.flexDirection = 'column';
    centerPanel.style.alignItems = 'center';
    centerPanel.style.gap = '10px';
    
    // Add stats bar to container
    uiContainer.appendChild(statsBar);
    
    // Add container and center panel to document
    document.body.appendChild(uiContainer);
    document.body.appendChild(centerPanel);
    
    // Create scoreboard in player stats row
    this.createScoreboard(playerStatsRow);
  }
  
  /**
   * Create ammo indicator in the UI
   */
  private createAmmoIndicator(container: HTMLElement): void {
    const ammoContainer = document.createElement('div');
    ammoContainer.id = 'ammo-indicator';
    ammoContainer.style.display = 'flex';
    ammoContainer.style.alignItems = 'center';
    ammoContainer.style.marginRight = '15px';
    
    const ammoIcon = document.createElement('span');
    ammoIcon.innerHTML = '🔫';
    ammoIcon.style.fontSize = '16px';
    ammoIcon.style.marginRight = '5px';
    
    const ammoText = document.createElement('span');
    ammoText.id = 'ammo-text';
    ammoText.style.fontSize = '14px';
    ammoText.style.fontWeight = 'bold';
    ammoText.style.color = 'white';
    
    ammoContainer.appendChild(ammoIcon);
    ammoContainer.appendChild(ammoText);
    
    container.appendChild(ammoContainer);
    
    // Initial update
    this.updateAmmoIndicator();
  }
  
  /**
   * Update the ammo indicator with current weapon ammo
   */
  private updateAmmoIndicator(): void {
    const ammoText = document.getElementById('ammo-text');
    if (!ammoText) return;
    
    const weapon = this.player.getWeapon();
    ammoText.textContent = `${weapon.ammo}/${weapon.maxAmmo}`;
    
    // Change color based on ammo level
    if (weapon.ammo === 0) {
      ammoText.style.color = 'red';
    } else if (weapon.ammo < weapon.maxAmmo * 0.3) {
      ammoText.style.color = 'orange';
    } else {
      ammoText.style.color = 'white';
    }
  }
  
  /**
   * Create the scoreboard to display player stats
   */
  private createScoreboard(container: HTMLElement): void {
    // Create scoreboard content with evenly spaced layout
    const scoreElement = document.createElement('div');
    scoreElement.innerHTML = `<strong>Score:</strong> <span id="score-value" style="color: #ffeb3b; font-weight: bold;">0</span>`;
    
    const healthElement = document.createElement('div');
    healthElement.innerHTML = `<strong>Health:</strong> <span id="health-value" style="color: #4caf50; font-weight: bold;">${this.player.health}/${this.player.maxHealth}</span>`;
    
    const killsElement = document.createElement('div');
    killsElement.innerHTML = `<strong>Kills:</strong> <span id="kills-value" style="color: #ff5722; font-weight: bold;">0</span>`;
    
    const timeElement = document.createElement('div');
    timeElement.innerHTML = `<strong>Time:</strong> <span id="time-value" style="color: #2196f3; font-weight: bold;">0:00</span>`;
    
    // Style each element for the top row
    [scoreElement, healthElement, killsElement, timeElement].forEach(el => {
      el.style.display = 'inline-block';
      el.style.whiteSpace = 'nowrap';
      el.style.textAlign = 'center';
      el.style.flex = '1';
    });
    
    // Add elements directly to the container
    container.appendChild(scoreElement);
    container.appendChild(healthElement);
    container.appendChild(killsElement);
    container.appendChild(timeElement);
    
    // Store reference to the scoreboard
    this.scoreboardElement = container;
  }
  
  /**
   * Create the wave indicator to show current wave
   */
  private createWaveIndicator(container: HTMLElement): void {
    // Create wave indicator element
    const waveElement = document.createElement('div');
    waveElement.id = 'wave-indicator';
    waveElement.innerHTML = `<strong>Wave:</strong> <span id="wave-value" style="color: #e91e63; font-weight: bold;">${this.waveNumber}</span>`;
    waveElement.style.flex = '1';
    waveElement.style.textAlign = 'center';
    
    // Add element to the container
    container.appendChild(waveElement);
    
    // Store reference to the wave indicator
    this.waveIndicatorElement = waveElement;
  }
  
  /**
   * Update the scoreboard with current stats
   */
  private updateScoreboard(): void {
    if (!this.scoreboardElement) return;
    
    // Update score
    const scoreValue = this.scoreboardElement.querySelector('#score-value');
    if (scoreValue) {
    scoreValue.textContent = this.gameScore.toString();
    }
    
    // Update health
    const healthValue = this.scoreboardElement.querySelector('#health-value');
    if (healthValue) {
      healthValue.textContent = `${Math.floor(this.player.health)}/${this.player.maxHealth}`;
    }
    
    // Update kills
    const killsValue = this.scoreboardElement.querySelector('#kills-value');
    if (killsValue) {
    killsValue.textContent = this.player.kills.toString();
    }
    
    // Update time
    const timeValue = this.scoreboardElement.querySelector('#time-value');
    if (timeValue) {
    const minutes = Math.floor(this.player.timeSurvived / 60);
    const seconds = Math.floor(this.player.timeSurvived % 60);
      timeValue.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  }
  
  /**
   * Update the wave indicator
   */
  private updateWaveIndicator(showTemporarily: boolean = false): void {
    if (!this.waveIndicatorElement) return;
    
    // Update wave number
    const waveValue = this.waveIndicatorElement.querySelector('#wave-value');
    if (waveValue) {
      waveValue.textContent = this.waveNumber.toString();
    }
    
    // Show temporarily with highlight if requested
    if (showTemporarily) {
      // Highlight just the wave value instead of the entire element
      if (waveValue) {
        const waveValueElement = waveValue as HTMLElement;
        waveValueElement.style.color = '#ff5722';
        waveValueElement.style.fontSize = '110%';
        
        setTimeout(() => {
          if (waveValue) {
            const waveValueElement = waveValue as HTMLElement;
            waveValueElement.style.color = '#e91e63';
            waveValueElement.style.fontSize = '100%';
          }
        }, 2000);
      }
    }
  }
  
  /**
   * Show a message that the game is running in single-player mode
   */
  private showSinglePlayerModeMessage(): void {
    // Get the center panel from the UI container
    const centerPanel = document.getElementById('game-ui-center-panel');
    if (!centerPanel) return;
    
    // Create message element
    const messageElement = document.createElement('div');
    messageElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    messageElement.style.color = 'white';
    messageElement.style.padding = '10px 20px';
    messageElement.style.borderRadius = '5px';
    messageElement.style.fontFamily = 'Arial, sans-serif';
    messageElement.style.fontSize = '14px';
    messageElement.style.textAlign = 'center';
    messageElement.textContent = 'Running in single-player mode (multiplayer coming soon)';
    
    // Add to center panel
    centerPanel.appendChild(messageElement);
    
    // Remove the message after 5 seconds
    setTimeout(() => {
      if (messageElement.parentNode) {
        messageElement.parentNode.removeChild(messageElement);
      }
    }, 5000);
  }

  private spawnInitialZombies(count: number): void {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const radius = 20;
      
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      
      console.log(`Spawning initial zombie at position (${x}, 0, ${z})`);
      this.spawnZombieAt(x, z);
    }
  }

  private spawnZombie(): void {
    // Don't spawn zombies if the game is over or the player is dead
    if (!this.player.isAlive) return;
    
    // Check if we're at the maximum number of zombies
    if (this.zombies.length >= this.maxZombies) {
      this.removeOldestDistantZombie();
    }
    
    // Spawn a zombie at a random position on the edge of the map
    const radius = 50 + Math.random() * 20;
    const angle = Math.random() * Math.PI * 2;
    
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    
    this.spawnZombieAt(x, z);
  }
  
  private removeOldestDistantZombie(): void {
    if (this.zombies.length === 0) return;
    
    const playerPos = this.player.getMesh().position;
    
    let furthestZombie = this.zombies[0];
    let maxDistance = 0;
    
    for (const zombie of this.zombies) {
      if (!zombie.isAlive) continue;
      
      const zombiePos = zombie.getMesh().position;
      const dx = zombiePos.x - playerPos.x;
      const dz = zombiePos.z - playerPos.z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      
      if (distance > maxDistance) {
        maxDistance = distance;
        furthestZombie = zombie;
      }
    }
    
    if (furthestZombie) {
      this.uiSystem.removeHealthBar(furthestZombie);
      this.renderingSystem.removeFromScene(furthestZombie.getMesh());
      
      const index = this.zombies.indexOf(furthestZombie);
      if (index > -1) {
        this.zombies.splice(index, 1);
      }
    }
  }
  
  private spawnZombieAt(x: number, z: number): void {
    const zombie = new Zombie(new THREE.Vector3(x, 0, z));
    this.zombies.push(zombie);
    this.renderingSystem.addToScene(zombie.getMesh());
    this.uiSystem.createHealthBar(zombie, false);
    
    if (this.debugMode) {
      const markerGeometry = new THREE.SphereGeometry(0.5, 8, 8);
      const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true });
      const marker = new THREE.Mesh(markerGeometry, markerMaterial);
      marker.position.set(x, 2, z);
      this.renderingSystem.addToScene(marker);
    }
  }

  private updateRespawnCountdown(deltaTime: number): void {
    if (this.respawnCountdown > 0) {
      this.respawnCountdown -= deltaTime;
      
      // Update countdown text
      const countdownElement = document.getElementById('respawn-countdown');
      if (countdownElement) {
        const secondsLeft = Math.ceil(this.respawnCountdown);
        countdownElement.textContent = secondsLeft.toString();
        
        // Add a pulse effect when the number changes
        countdownElement.style.transform = 'scale(1.2)';
        setTimeout(() => {
          if (countdownElement) {
            countdownElement.style.transform = 'scale(1)';
          }
        }, 200);
      }
      
      // When countdown reaches 0, enable the respawn button
      if (this.respawnCountdown <= 0) {
        // Update the respawn button if on mobile
        if (this.isMobile) {
          const respawnButton = document.getElementById('respawn-button');
          const respawnMessage = countdownElement?.nextElementSibling;
          
          if (respawnButton) {
            // Enable the button
            respawnButton.removeAttribute('disabled');
            respawnButton.style.backgroundColor = '#ff3333';
            respawnButton.style.color = 'white';
            respawnButton.style.cursor = 'pointer';
            respawnButton.style.opacity = '1';
            respawnButton.style.pointerEvents = 'auto';
            respawnButton.textContent = 'RESPAWN NOW';
            
            // Update message
            if (respawnMessage) {
              respawnMessage.textContent = 'Tap to respawn';
            }
            
            // Add event listeners
            respawnButton.addEventListener('touchstart', () => {
              if (respawnButton) {
                respawnButton.style.backgroundColor = '#cc0000';
                respawnButton.style.transform = 'scale(0.98)';
              }
            });
            
            respawnButton.addEventListener('touchend', () => {
              if (respawnButton) {
                respawnButton.style.backgroundColor = '#ff3333';
                respawnButton.style.transform = 'scale(1)';
              }
              this.respawnPlayer();
            });
          }
        } else {
          // Update desktop message
          const respawnMessage = countdownElement?.nextElementSibling;
          const keyboardMessage = respawnMessage?.nextElementSibling;
          
          if (respawnMessage) {
            respawnMessage.textContent = 'Ready to respawn';
          }
          
          if (keyboardMessage) {
            (keyboardMessage as HTMLElement).style.color = '#ffffff';
            keyboardMessage.textContent = 'Press R to respawn now';
          }
          
          // Add keyboard event listener for R key
          const handleRespawnKeyPress = (e: KeyboardEvent) => {
            if (e.code === 'KeyR') {
              this.respawnPlayer();
              // Remove the event listener after respawn
              window.removeEventListener('keydown', handleRespawnKeyPress);
            }
          };
          
          window.addEventListener('keydown', handleRespawnKeyPress);
        }
        
        // Don't automatically respawn - wait for player input
        // Keep the countdown at 0 to prevent multiple calls
        this.respawnCountdown = 0;
      }
    }
  }
  
  private cleanupRespawnUI(): void {
    // Remove death overlay if it exists
    const deathOverlay = document.getElementById('death-overlay');
    if (deathOverlay) {
      // Remove any event listeners on the respawn button
      const respawnButton = document.getElementById('respawn-button');
      if (respawnButton && this.isMobile) {
        respawnButton.removeEventListener('touchstart', () => {});
        respawnButton.removeEventListener('touchend', () => {});
      }
      
      // Remove the entire overlay
      document.body.removeChild(deathOverlay);
    }
  }
  
  private respawnPlayer(): void {
    console.log('Respawning player...');
    
    // Clean up any existing respawn UI elements
    this.cleanupRespawnUI();
    
    // Reset player state
    this._gameOver = false;
    this.playerDead = false;
    this.respawnCountdown = 0;
    
    // Clear all existing zombies
    this.clearAllZombies();
    
    // Find a safe location to respawn
    const safeLocation = this.findSafeSpawnLocation();
    
    // Reset player health and position
    this.player.revive();
    this.player.getMesh().position.copy(safeLocation);
    
    // Update health bar
    this.uiSystem.updateHealthBar(this.player);
    
    // Reset game difficulty when player respawns
    this.resetGameDifficulty();
    // Note: resetGameDifficulty already shows the reset notification, so we don't need to call it again here
    
    // Spawn initial zombies after a delay to give player time to orient
    setTimeout(() => {
      this.spawnInitialZombies(3);
    }, 2000);
    
    console.log('Player respawned at', safeLocation);
  }
  
  // New method to clear all zombies
  private clearAllZombies(): void {
    // Remove all zombie meshes from the scene
    for (const zombie of this.zombies) {
      // Remove health bar
      this.uiSystem.removeHealthBar(zombie);
      
      // Remove mesh from scene
      this.renderingSystem.removeFromScene(zombie.getMesh());
    }
    
    // Clear the zombies array
    this.zombies = [];
    console.log('Cleared all zombies for player respawn');
  }
  
  private findSafeSpawnLocation(): THREE.Vector3 {
    const safeDistance = 20;
    const maxAttempts = 20;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 30 + Math.random() * 20;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      
      let isSafe = true;
      for (const zombie of this.zombies) {
        if (!zombie.isAlive) continue;
        
        const zombiePos = zombie.getMesh().position;
        const dx = x - zombiePos.x;
        const dz = z - zombiePos.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        
        if (distance < safeDistance) {
          isSafe = false;
          break;
        }
      }
      
      if (isSafe) {
        return new THREE.Vector3(x, 0, z);
      }
    }
    
    const angle = Math.random() * Math.PI * 2;
    const radius = 40;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    
    return new THREE.Vector3(x, 0, z);
  }

  private increaseDifficulty(): void {
    // Only increase difficulty if the player is alive
    // This is a safeguard in case this method is called when player is dead
    if (!this.player.isAlive) return;
    
    this.waveNumber++;
    
    // Make zombies spawn faster as waves progress
    this.zombieSpawnRate = Math.max(
      this.minSpawnRate,
      this.zombieSpawnRate * this.difficultyScalingFactor
    );
    
    // Spawn more zombies per wave as the game progresses
    const waveZombies = Math.min(this.waveNumber + 2, 15);
    for (let i = 0; i < waveZombies; i++) {
      setTimeout(() => {
        // Only spawn if player is still alive when the timeout fires
        if (this.player.isAlive) {
          this.spawnZombie();
        }
      }, i * 500);
    }
    
    // Increase zombie speed and health with each wave
    if (this.waveNumber > 1) {
      for (const zombie of this.zombies) {
        if (zombie.isAlive) {
          // Increase speed by 5% each wave, up to double the original speed
          zombie.speed = Math.min(zombie.speed * 1.05, zombie.speed * 2);
          
          // Increase max health by 10% each wave, up to triple the original health
          const healthIncrease = zombie.maxHealth * 0.1;
          zombie.maxHealth = Math.min(zombie.maxHealth + healthIncrease, zombie.maxHealth * 3);
          zombie.health += healthIncrease;
          
          // Update health bar to reflect new max health
          this.uiSystem.updateHealthBar(zombie);
        }
      }
    }
    
    this.updateWaveIndicator(true);
    
    this.showWaveNotification();
  }
  
  private showWaveNotification(): void {
    // Get the center panel from the UI container
    const centerPanel = document.getElementById('game-ui-center-panel');
    if (!centerPanel) return;
    
    // Create wave notification banner
    const notification = document.createElement('div');
    notification.id = 'wave-notification';
    notification.style.backgroundColor = 'rgba(200, 0, 0, 0.8)';
    notification.style.color = 'white';
    notification.style.padding = '8px 15px';
    notification.style.borderRadius = '5px';
    notification.style.fontFamily = 'Arial, sans-serif';
    notification.style.fontSize = '16px';
    notification.style.fontWeight = 'bold';
    notification.style.textAlign = 'center';
    notification.style.width = '80%';
    notification.style.maxWidth = '500px';
    notification.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.5)';
    notification.style.transform = 'translateY(-20px)';
    notification.style.opacity = '0';
    notification.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out';
    
    // Create wave text with icon
    notification.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; gap: 10px;">
        <span style="font-size: 20px;">⚠️</span>
        <span>Wave ${this.waveNumber} - Zombies are getting stronger!</span>
      </div>
    `;
    
    // Add to center panel
    centerPanel.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
      notification.style.transform = 'translateY(0)';
      notification.style.opacity = '1';
    }, 10);
    
    // Animate out and remove after a delay
    setTimeout(() => {
      notification.style.transform = 'translateY(-20px)';
      notification.style.opacity = '0';
      
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

  public start(): void {
    this.lastTime = performance.now();
    requestAnimationFrame(this.loop.bind(this));
    console.log('Game started!');
  }

  private loop(currentTime: number): void {
    // Calculate delta time in seconds
    const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1); // Cap at 100ms to prevent huge jumps
    this.lastTime = currentTime;
    
    // Only update game if player is alive or still in respawn countdown
    if (this.player.isAlive || this.playerDead) {
      // Handle player input
      this.handleInput();
      
      // Update respawn countdown if player is dead
      if (this.playerDead) {
        this.updateRespawnCountdown(deltaTime);
      }
      
      // Get player's intended movement from InputSystem before applying it
      const input = this.inputSystem.getInput();
      const isMobile = this.inputSystem.isMobile();
      let moveX = 0;
      let moveY = 0;
      
      if (isMobile) {
        const moveJoystickInput = this.inputSystem.getMoveJoystickInput();
        moveX = moveJoystickInput.x;
        moveY = moveJoystickInput.y;
      } else {
        // Get movement direction from keyboard input
        if (input['w']) moveY -= 1;
        if (input['s']) moveY += 1;
        if (input['a']) moveX -= 1;
        if (input['d']) moveX += 1;
        
        // Normalize if moving diagonally
        if (moveX !== 0 && moveY !== 0) {
          const length = Math.sqrt(moveX * moveX + moveY * moveY);
          moveX /= length;
          moveY /= length;
        }
      }
      
      // Only apply movement if player is alive
      if (this.player.isAlive && (moveX !== 0 || moveY !== 0)) {
        // Calculate potential new position
        const playerPos = this.player.getMesh().position;
        const speed = this.player.speed;
        const newX = playerPos.x + moveX * speed * deltaTime;
        const newY = playerPos.z + moveY * speed * deltaTime;
        
        // Check if new position would cause collision with any zombie
        // and get the adjusted position for sliding along the edge
        const collisionResult = this.checkPlayerZombieCollision(newX, newY);
        
        // Update to the final position (either the original target or the slide position)
        this.player.updatePosition(collisionResult.x, collisionResult.y);
      }
      
      // Update the player
      this.player.update(deltaTime, this.inputSystem);
      
      // Update the health bar position
      this.uiSystem.updateHealthBar(this.player);
      
      // Update melee cooldown indicator
      this.updateMeleeCooldownIndicator();
      
      // Update shoot cooldown indicator
      this.updateShootCooldownIndicator();
      
      // Only spawn zombies and increase difficulty if the player is alive
      // This stops wave progression when all players are dead
      if (this.player.isAlive) {
        // Update zombie spawning
        this.zombieSpawnTime += deltaTime;
        if (this.zombieSpawnTime >= this.zombieSpawnRate) {
          this.spawnZombie();
          this.zombieSpawnTime = 0;
        }
        
        // Scale difficulty over time
        this.timeSinceLastDifficultyIncrease += deltaTime;
        if (this.timeSinceLastDifficultyIncrease >= this.difficultyIncreaseInterval) {
          this.increaseDifficulty();
          this.timeSinceLastDifficultyIncrease = 0;
        }
      }
      
      // Update all zombies
      for (const zombie of this.zombies) {
        if (zombie.isAlive) {
          // Pass player position to zombie update instead of player object
          zombie.update(deltaTime, this.player.getMesh().position);
          this.uiSystem.updateHealthBar(zombie);
          
          // Check distance for zombie attack
          const zombiePos = zombie.getMesh().position;
          const playerPos = this.player.getMesh().position;
          const dx = playerPos.x - zombiePos.x;
          const dz = playerPos.z - zombiePos.z;
          const distance = Math.sqrt(dx * dx + dz * dz);
          
          // Zombie damages player when close enough
          if (distance <= 0.7 && this.player.isAlive) {
            const damage = 5 * deltaTime; // Damage scaled by time
            this.player.takeDamage(damage);
            
            // Check if player died from this attack
            if (!this.player.isAlive) {
              this.handlePlayerDeath();
            }
          }
        }
      }
      
      // Clean up dead zombies periodically to avoid performance issues
      const now = performance.now() / 1000;
      if (now - this.lastZombieCleanupTime > this.zombieCleanupInterval) {
        this.cleanupDeadZombies();
        this.lastZombieCleanupTime = now;
      }
      
      // Update scoreboard
      this.updateScoreboard();
      
      // Update ammo indicator
      this.updateAmmoIndicator();
      
      // Update camera position to follow player
      const playerPos = this.player.getMesh().position;
      this.renderingSystem.setCameraPosition(playerPos.x, playerPos.y, playerPos.z);
      
      // Update all health bar positions to follow their entities
      this.uiSystem.update(this.renderingSystem.getCamera());
    
      // Render the scene
      this.renderingSystem.render();
      
      // Update mobile controls position if needed
      if (this.isMobile && this.mobileControlsElement) {
        this.updateMobileControlsPosition();
      }
    }
    
    // Continue game loop
    requestAnimationFrame(this.loop.bind(this));
  }
  
  private handleKeyDown(event: KeyboardEvent): void {
    if (this.playerDead) {
      if (event.code === 'KeyR' && this.respawnCountdown <= 0) {
        this.respawnPlayer();
        console.log('Manual respawn triggered');
      }
      return;
    }
    
    if (event.code === 'Space') {
      this.shootZombie();
    }
    
    if (event.code === 'KeyH') {
      this.player.heal(10);
      console.log('Player healed! Health: ' + this.player.health);
      this.updateScoreboard();
    }
    
    if (event.code === 'KeyD') {
      this.debugMode = !this.debugMode;
      console.log('Debug mode:', this.debugMode);
    }
    
    if (event.code === 'KeyZ') {
      const angle = Math.random() * Math.PI * 2;
      const radius = 15;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      this.spawnZombieAt(x, z);
      console.log('Manually spawned zombie at:', x, z);
    }
    
    if (event.code === 'KeyK') {
      this.player.takeDamage(this.player.health);
      if (!this.player.isAlive) {
        this.handlePlayerDeath();
      }
      console.log('Player killed for testing respawn');
    }
  }
  
  private handleInput(): void {
    const input = this.inputSystem.getInput();
    const currentTime = performance.now() / 1000;
    
    // Get weapon cooldown from player's current weapon
    const weapon = this.player.getWeapon();
    const shootCooldown = weapon.cooldown;
    
    // Handle shooting with keyboard or aim joystick
    if (this.inputSystem.isShooting() && this.player.isAlive) {
      if (currentTime - this.lastShootTime >= shootCooldown) {
        // Can shoot - weapon is ready
        if (weapon.canFire()) {
          this.shootZombie();
          weapon.fire(); // Consume ammo
          this.lastShootTime = currentTime;
        } else {
          // Out of ammo - show feedback
          this.showOutOfAmmoFeedback();
        }
      } else {
        // Weapon is on cooldown - show visual feedback
        this.showWeaponCooldownFeedback();
      }
    }
    
    // Handle melee attack
    if (input['e'] && this.player.isAlive) {
      this.meleeAttack();
    }
    
    // Handle weapon reload
    if (input['r'] && this.player.isAlive) {
      weapon.reload();
    }
  }
  
  private shootZombie(): void {
    if (!this.player.isAlive) return;
    
    // Play gunshot sound
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(150, audioContext.currentTime);
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.3);
    
    // Get the player's weapon
    const weapon = this.player.getWeapon();
    
    // Create bullet effect from player
    // We don't need playerMesh here, so removing it
    
    // Get the weapon position for bullet start
    const bulletStart = this.player.getWeaponTipPosition();
    
    // Get direction player is facing
    const direction = this.player.getForwardDirection();
    
    // Define bullet damage based on weapon
    const bulletDamage = weapon.damage;
    
    // Create a bullet trail effect
    this.createBulletTrail(bulletStart, direction);
    
    // SIMPLIFIED APPROACH: Find zombies in front of the player within a certain range and angle
    const maxRange = weapon.range;
    const maxAngleCos = weapon.accuracy; // Use weapon accuracy for targeting cone
    
    // Log all zombies for debugging
    console.log(`Total zombies: ${this.zombies.length}, Alive zombies: ${this.zombies.filter(z => z.isAlive).length}`);
    
    // Sort zombies by distance
    const targetableZombies = this.zombies
      .filter(zombie => zombie.isAlive)
      .map(zombie => {
        const zombiePos = zombie.getMesh().position;
        const toZombie = new THREE.Vector3().subVectors(zombiePos, bulletStart);
        const distance = toZombie.length();
        const angleCos = toZombie.normalize().dot(direction);
        
        // Debug info for each zombie
        console.log(`Zombie at (${zombiePos.x.toFixed(1)}, ${zombiePos.z.toFixed(1)}), distance: ${distance.toFixed(1)}, angle cos: ${angleCos.toFixed(2)}`);
        
        return { zombie, distance, angleCos };
      })
      .filter(({ distance, angleCos }) => distance <= maxRange && angleCos > maxAngleCos)
      .sort((a, b) => a.distance - b.distance);
    
    // Debug info
    console.log(`Found ${targetableZombies.length} zombies in firing cone`);
    
    // Hit the closest zombie if any are in range
    if (targetableZombies.length > 0) {
      const { zombie: hitZombie, distance } = targetableZombies[0];
      
      console.log(`Hit zombie at distance: ${distance.toFixed(2)}, health before: ${hitZombie.health}`);
      
      // Apply damage
      hitZombie.takeDamage(bulletDamage);
      
      console.log(`Zombie health after hit: ${hitZombie.health}`);
      
      // Force update the zombie's health bar
      this.uiSystem.updateHealthBar(hitZombie);
      
      // Force an immediate render to update the health bar visually
      this.renderingSystem.render();
      
      if (!hitZombie.isAlive) {
        // Update player kills and game score
        this.player.addKill();
        this.gameScore += 100; // Base score for zombie kill
        
        // Bonus points for distance
        const distanceBonus = Math.floor(distance * 10);
        this.gameScore += distanceBonus;
        
        console.log(`Killed zombie at distance ${distance.toFixed(2)}m! +${100 + distanceBonus} points`);
      }
    } else {
      // Missed shot
      console.log('Shot fired but missed! No zombies in firing cone.');
    }
  }

  private handlePlayerDeath(): void {
    // Set player state to dead but keep _gameOver separate
    // This allows the respawn countdown to work
    this.playerDead = true;
    this._gameOver = true;
    
    console.log('Player died! Score: ' + this.gameScore);
    
    // Start respawn countdown
    this.respawnCountdown = this.respawnTime;
    
    // Store player stats for respawn comparison
    const finalWave = this.waveNumber;
    const finalKills = this.player.kills;
    const finalTime = this.player.timeSurvived;
    const finalScore = this.gameScore;
    
    // Create a single, clean death overlay
    const deathOverlay = document.createElement('div');
    deathOverlay.id = 'death-overlay';
    deathOverlay.style.position = 'absolute';
    deathOverlay.style.top = '50%';
    deathOverlay.style.left = '50%';
    deathOverlay.style.transform = 'translate(-50%, -50%)';
    deathOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    deathOverlay.style.padding = '30px';
    deathOverlay.style.borderRadius = '10px';
    deathOverlay.style.color = 'white';
    deathOverlay.style.textAlign = 'center';
    deathOverlay.style.zIndex = '1001';
    deathOverlay.style.minWidth = '320px';
    deathOverlay.style.maxWidth = '90%';
    deathOverlay.style.boxShadow = '0 0 30px rgba(255, 0, 0, 0.5)';
    deathOverlay.style.border = '2px solid rgba(255, 0, 0, 0.5)';
    
    // Calculate time survived
    const minutes = Math.floor(finalTime / 60);
    const seconds = Math.floor(finalTime % 60);
    
    // Create different HTML based on device type
    let respawnControlsHTML = '';
    
    if (this.isMobile) {
      // Mobile version with button - initially greyed out
      respawnControlsHTML = `
        <div id="respawn-countdown" style="color: red; font-size: 64px; font-weight: bold; margin-bottom: 20px;">${Math.ceil(this.respawnCountdown)}</div>
        <div style="font-size: 16px; color: #aaa; margin-bottom: 15px;">Wait for countdown to finish...</div>
        <button id="respawn-button" style="
          background-color: #777777;
          color: #aaaaaa;
          border: none;
          padding: 15px 30px;
          border-radius: 50px;
          font-size: 18px;
          font-weight: bold;
          margin-top: 10px;
          box-shadow: 0 4px 8px rgba(0,0,0,0.3);
          cursor: not-allowed;
          width: 80%;
          transition: all 0.3s;
          -webkit-tap-highlight-color: transparent;
          opacity: 0.7;
          pointer-events: none;
        " disabled>WAIT TO RESPAWN</button>
      `;
    } else {
      // Desktop version with keyboard instruction
      respawnControlsHTML = `
        <div id="respawn-countdown" style="color: red; font-size: 64px; font-weight: bold; margin-bottom: 20px;">${Math.ceil(this.respawnCountdown)}</div>
        <div style="font-size: 16px; color: #aaa; margin-bottom: 15px;">Wait for countdown to finish...</div>
        <div style="font-size: 16px; color: #777;">Press R when countdown finishes</div>
      `;
    }
    
    // Create the content with a sleeker design and numerical countdown
    deathOverlay.innerHTML = `
      <div style="color: red; font-size: 48px; font-weight: bold; margin-bottom: 25px; text-shadow: 2px 2px 4px #000; letter-spacing: 2px;">YOU DIED</div>
      <div style="font-size: 18px; margin-bottom: 10px; color: #eee;">Wave Reached: ${finalWave}</div>
      <div style="font-size: 18px; margin-bottom: 10px; color: #eee;">Zombies Killed: ${finalKills}</div>
      <div style="font-size: 18px; margin-bottom: 10px; color: #eee;">Time Survived: ${minutes}:${seconds.toString().padStart(2, '0')}</div>
      <div style="font-size: 18px; margin-bottom: 30px; color: #eee;">Score: ${finalScore}</div>
      ${respawnControlsHTML}
    `;
    
    document.body.appendChild(deathOverlay);
    
    // We'll enable the button when the countdown finishes
  }

  private resetGameDifficulty(): void {
    // Reset to initial wave and spawn rate
    this.zombieSpawnRate = this.initialZombieSpawnRate;
    this.waveNumber = 1;
    this.timeSinceLastDifficultyIncrease = 0;
    
    // Update wave indicator
    this.updateWaveIndicator(true);
    
    // Show reset notification
    this.showResetNotification();
  }
  
  private showResetNotification(): void {
    // Get the center panel from the UI container
    const centerPanel = document.getElementById('game-ui-center-panel');
    if (!centerPanel) return;
    
    // Remove any existing reset notifications first
    const existingNotification = document.getElementById('reset-notification');
    if (existingNotification && existingNotification.parentNode) {
      existingNotification.parentNode.removeChild(existingNotification);
    }
    
    // Create reset notification banner
    const notification = document.createElement('div');
    notification.id = 'reset-notification';
    notification.style.backgroundColor = 'rgba(0, 100, 200, 0.8)';
    notification.style.color = 'white';
    notification.style.padding = '8px 15px';
    notification.style.borderRadius = '5px';
    notification.style.fontFamily = 'Arial, sans-serif';
    notification.style.fontSize = '16px';
    notification.style.fontWeight = 'bold';
    notification.style.textAlign = 'center';
    notification.style.width = '80%';
    notification.style.maxWidth = '500px';
    notification.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.5)';
    notification.style.transform = 'translateY(-20px)';
    notification.style.opacity = '0';
    notification.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out';
    
    // Create reset text with icon
    notification.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; gap: 10px;">
        <span style="font-size: 20px;">🔄</span>
        <span>Game Reset - Starting from Wave 1</span>
      </div>
    `;
    
    // Add to center panel
    centerPanel.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
      notification.style.transform = 'translateY(0)';
      notification.style.opacity = '1';
    }, 10);
    
    // Animate out and remove after a delay
    setTimeout(() => {
      notification.style.transform = 'translateY(-20px)';
      notification.style.opacity = '0';
      
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

  public stop(): void {
    // Clean up event listeners
    window.removeEventListener('keydown', this.handleKeyDown.bind(this));
    window.removeEventListener('resize', this.handleWindowResize.bind(this));
    
    // Clean up all UI elements
    this.cleanupRespawnUI();
    
    if (this.scoreboardElement) {
      document.body.removeChild(this.scoreboardElement);
    }
    
    if (this.waveIndicatorElement) {
      document.body.removeChild(this.waveIndicatorElement);
    }
    
    if (this.mobileControlsElement) {
      document.body.removeChild(this.mobileControlsElement);
    }
    
    if (this.meleeCooldownIndicator) {
      document.body.removeChild(this.meleeCooldownIndicator);
    }
    
    if (this.shootCooldownIndicator) {
      document.body.removeChild(this.shootCooldownIndicator);
    }
    
    // Clean up UI containers
    const uiContainer = document.getElementById('game-ui-container');
    if (uiContainer) {
      document.body.removeChild(uiContainer);
    }
    
    const centerPanel = document.getElementById('game-ui-center-panel');
    if (centerPanel) {
      document.body.removeChild(centerPanel);
    }
    
    // Clean up systems
    this.uiSystem.cleanup();
  }

  private createBulletTrail(start: THREE.Vector3, direction: THREE.Vector3): void {
    // Create a line showing the bullet trajectory
    const bulletLength = 50; // How far the bullet travels
    const end = new THREE.Vector3().copy(start).addScaledVector(direction, bulletLength);
    
    // Create a more visible bullet trail with a thicker line
    const bulletGeometry = new THREE.BufferGeometry().setFromPoints([start, end]);
    const bulletMaterial = new THREE.LineBasicMaterial({ 
      color: 0xffff00,
      transparent: true,
      opacity: 0.8,
      linewidth: 2 // Reduced linewidth for a narrower appearance
    });
    const bulletLine = new THREE.Line(bulletGeometry, bulletMaterial);
    
    // Add a small cone at the start to represent the bullet width/spread
    const coneLength = 0.3;
    const coneRadius = 0.05; // Reduced radius for a narrower bullet spread (was 0.1)
    const coneGeometry = new THREE.ConeGeometry(coneRadius, coneLength, 8);
    const coneMaterial = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 0.6
    });
    
    const cone = new THREE.Mesh(coneGeometry, coneMaterial);
    
    // Position and orient the cone to point in the direction of the bullet
    cone.position.copy(start);
    
    // Create a quaternion to rotate the cone to align with the direction vector
    const quaternion = new THREE.Quaternion();
    // Default cone points up (0, 1, 0), we need to rotate it to match our direction
    const upVector = new THREE.Vector3(0, 1, 0);
    quaternion.setFromUnitVectors(upVector, direction);
    cone.setRotationFromQuaternion(quaternion);
    
    // Add the bullet trail and cone to the scene
    this.renderingSystem.addToScene(bulletLine);
    this.renderingSystem.addToScene(cone);
    
    // Remove the bullet trail and cone after a short time
    setTimeout(() => {
      this.renderingSystem.removeFromScene(bulletLine);
      this.renderingSystem.removeFromScene(cone);
    }, 100);
  }

  /**
   * Set up network event listeners
   * This is a placeholder for future multiplayer functionality
   */
  private setupNetworkListeners(): void {
    // Show a message if running in single-player mode
    setTimeout(() => {
      this.showSinglePlayerModeMessage();
    }, 3000);
  }

  // Improved method to clean up dead zombies
  private cleanupDeadZombies(): void {
    // Filter out dead zombies that have been dead for more than 3 seconds
    const currentTime = performance.now() / 1000;
    let removedCount = 0;
    
    for (let i = this.zombies.length - 1; i >= 0; i--) {
      const zombie = this.zombies[i];
      
      // Check if zombie is dead and has been dead long enough
      if (!zombie.isAlive && zombie.deathTime && (currentTime - zombie.deathTime > 3)) {
        // Remove from scene and UI
        this.uiSystem.removeHealthBar(zombie);
        this.renderingSystem.removeFromScene(zombie.getMesh());
        
        // Remove from array
        this.zombies.splice(i, 1);
        removedCount++;
      }
    }
    
    // Log cleanup info if any zombies were removed
    if (removedCount > 0) {
      console.log(`Cleaned up ${removedCount} dead zombies. Remaining: ${this.zombies.length}`);
    }
  }

  private showWeaponCooldownFeedback(): void {
    // Get the weapon position from the player
    const weaponPosition = this.player.getWeaponTipPosition();
    
    // Create a small flash at the weapon position
    const flashGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const flashMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.3
    });
    
    const flash = new THREE.Mesh(flashGeometry, flashMaterial);
    
    // Position the flash at the weapon tip
    flash.position.copy(weaponPosition);
    
    // Add to scene
    this.renderingSystem.addToScene(flash);
    
    // Animate the flash
    let scale = 1.0;
    const animateFlash = () => {
      scale -= 0.1;
      if (scale > 0) {
        flash.scale.set(scale, scale, scale);
        flash.material.opacity = scale * 0.3;
        requestAnimationFrame(animateFlash);
      } else {
        this.renderingSystem.removeFromScene(flash);
      }
    };
    
    // Start animation
    animateFlash();
  }

  private meleeAttack(): void {
    if (!this.player.isAlive) return;
    
    // Check cooldown
    const currentTime = performance.now() / 1000;
    if (currentTime - this.lastMeleeTime < this.meleeCooldown) {
      // Still on cooldown
      return;
    }
    
    // Set last melee time to current time
    this.lastMeleeTime = currentTime;
    
    // Play melee sound
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.2);
    
    // Create melee effect animation
    this.createMeleeEffect();
    
    // Apply camera shake for impact feel
    this.applyCameraShake(0.3, 0.5);
    
    // Get player position and direction
    const playerPos = this.player.getMesh().position;
    const playerDirection = this.player.getForwardDirection();
    
    // Find zombies in melee range
    const meleeZombies: Zombie[] = [];
    
    for (const zombie of this.zombies) {
      if (!zombie.isAlive) continue;
      
      const zombiePos = zombie.getMesh().position;
      const dx = zombiePos.x - playerPos.x;
      const dz = zombiePos.z - playerPos.z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      
      // Check if zombie is within melee range
      if (distance <= this.meleeRange) {
        // Calculate dot product to check if zombie is in front of player
        const directionToZombie = new THREE.Vector3(dx, 0, dz).normalize();
        const dotProduct = directionToZombie.dot(playerDirection);
        
        // If dot product is positive, zombie is in front of player
        if (dotProduct > 0) {
          meleeZombies.push(zombie);
        }
      }
    }
    
    // Apply damage and knockback to zombies in range
    for (const zombie of meleeZombies) {
      // Apply small damage
      zombie.takeDamage(15);
      
      // Calculate knockback direction
      const zombiePos = zombie.getMesh().position;
      const dx = zombiePos.x - playerPos.x;
      const dz = zombiePos.z - playerPos.z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      
      if (distance > 0) {
        // Normalize direction
        const knockbackDirection = new THREE.Vector3(dx / distance, 0, dz / distance);
        
        // Apply ragdoll effect with knockback
        zombie.applyRagdollEffect(knockbackDirection, this.meleeKnockback);
      }
      
      // Update health bar
      this.uiSystem.updateHealthBar(zombie);
    }
    
    console.log(`Melee attack hit ${meleeZombies.length} zombies`);
  }
  
  private createMeleeEffect(): void {
    // Get player position and direction
    const playerPos = this.player.getMesh().position;
    const playerDirection = this.player.getForwardDirection();
    
    // Create a cone geometry for the melee swing effect
    const swingGeometry = new THREE.ConeGeometry(1.5, this.meleeRange, 12);
    const swingMaterial = new THREE.MeshBasicMaterial({
      color: 0xff6600,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide
    });
    
    const swingMesh = new THREE.Mesh(swingGeometry, swingMaterial);
    
    // Position and rotate the swing effect
    swingMesh.position.set(
      playerPos.x + playerDirection.x * (this.meleeRange / 2),
      playerPos.y + 1,
      playerPos.z + playerDirection.z * (this.meleeRange / 2)
    );
    
    // Rotate to face the right direction
    swingMesh.lookAt(
      playerPos.x + playerDirection.x * this.meleeRange,
      playerPos.y + 1,
      playerPos.z + playerDirection.z * this.meleeRange
    );
    swingMesh.rotateX(Math.PI / 2);
    
    // Add to scene
    this.renderingSystem.addToScene(swingMesh);
    
    // Create impact particles
    this.createMeleeImpactParticles(playerPos, playerDirection);
    
    // Remove after animation completes
    setTimeout(() => {
      this.renderingSystem.removeFromScene(swingMesh);
    }, 300);
  }
  
  private createMeleeImpactParticles(playerPos: THREE.Vector3, direction: THREE.Vector3): void {
    // Create a group to hold all particles
    const particleGroup = new THREE.Group();
    
    // Position the group at the impact point
    const impactPoint = new THREE.Vector3(
      playerPos.x + direction.x * this.meleeRange,
      playerPos.y + 1,
      playerPos.z + direction.z * this.meleeRange
    );
    particleGroup.position.copy(impactPoint);
    
    // Create 15 particles
    const particleCount = 15;
    for (let i = 0; i < particleCount; i++) {
      // Create a small sphere for each particle
      const particleGeometry = new THREE.SphereGeometry(0.1, 4, 4);
      const particleMaterial = new THREE.MeshBasicMaterial({
        color: 0xff8800,
        transparent: true,
        opacity: 0.8
      });
      
      const particle = new THREE.Mesh(particleGeometry, particleMaterial);
      
      // Set random initial position within a small radius
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 0.5;
      particle.position.set(
        Math.cos(angle) * radius,
        Math.random() * 1 - 0.5,
        Math.sin(angle) * radius
      );
      
      // Store velocity for animation
      (particle as any).velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 5,
        Math.random() * 3 + 1,
        (Math.random() - 0.5) * 5
      );
      
      particleGroup.add(particle);
    }
    
    // Add the particle group to the scene
    this.renderingSystem.addToScene(particleGroup);
    
    // Animate and remove particles
    let frameCount = 0;
    const animateParticles = () => {
      frameCount++;
      
      // Update each particle
      particleGroup.children.forEach((object) => {
        // Cast to any to avoid type issues
        const particle = object as any;
        
        // Apply velocity
        particle.position.x += particle.velocity.x * 0.03;
        particle.position.y += particle.velocity.y * 0.03;
        particle.position.z += particle.velocity.z * 0.03;
        
        // Apply gravity
        particle.velocity.y -= 0.1;
        
        // Reduce size and opacity
        particle.scale.multiplyScalar(0.95);
        if (particle.material instanceof THREE.MeshBasicMaterial) {
          particle.material.opacity *= 0.95;
        }
      });
      
      // Continue animation for 20 frames
      if (frameCount < 20) {
        requestAnimationFrame(animateParticles);
      } else {
        // Remove particles from scene
        this.renderingSystem.removeFromScene(particleGroup);
      }
    };
    
    // Start animation
    animateParticles();
  }

  private setupUI(): void {
    // Create melee cooldown indicator
    this.meleeCooldownIndicator = document.createElement('div');
    this.meleeCooldownIndicator.id = 'melee-cooldown';
    this.meleeCooldownIndicator.style.position = 'absolute';
    this.meleeCooldownIndicator.style.bottom = '110px';
    this.meleeCooldownIndicator.style.right = '20px';
    this.meleeCooldownIndicator.style.width = '80px';
    this.meleeCooldownIndicator.style.height = '5px';
    this.meleeCooldownIndicator.style.backgroundColor = '#333';
    this.meleeCooldownIndicator.style.borderRadius = '2px';
    
    // Inner progress bar
    const cooldownProgress = document.createElement('div');
    cooldownProgress.id = 'melee-cooldown-progress';
    cooldownProgress.style.width = '100%';
    cooldownProgress.style.height = '100%';
    cooldownProgress.style.backgroundColor = '#ff6600';
    cooldownProgress.style.borderRadius = '2px';
    cooldownProgress.style.transformOrigin = 'left';
    cooldownProgress.style.transform = 'scaleX(1)';
    
    this.meleeCooldownIndicator.appendChild(cooldownProgress);
    document.body.appendChild(this.meleeCooldownIndicator);
    
    // Create shoot cooldown indicator
    this.shootCooldownIndicator = document.createElement('div');
    this.shootCooldownIndicator.id = 'shoot-cooldown';
    this.shootCooldownIndicator.style.position = 'absolute';
    this.shootCooldownIndicator.style.bottom = '120px';
    this.shootCooldownIndicator.style.right = '20px';
    this.shootCooldownIndicator.style.width = '80px';
    this.shootCooldownIndicator.style.height = '5px';
    this.shootCooldownIndicator.style.backgroundColor = '#333';
    this.shootCooldownIndicator.style.borderRadius = '2px';
    
    // Inner progress bar
    const shootCooldownProgress = document.createElement('div');
    shootCooldownProgress.id = 'shoot-cooldown-progress';
    shootCooldownProgress.style.width = '100%';
    shootCooldownProgress.style.height = '100%';
    shootCooldownProgress.style.backgroundColor = '#ff3333';
    shootCooldownProgress.style.borderRadius = '2px';
    shootCooldownProgress.style.transformOrigin = 'left';
    shootCooldownProgress.style.transform = 'scaleX(1)';
    
    this.shootCooldownIndicator.appendChild(shootCooldownProgress);
    document.body.appendChild(this.shootCooldownIndicator);
  }

  private updateMeleeCooldownIndicator(): void {
    if (!this.meleeCooldownIndicator) return;
    
    const cooldownProgress = document.getElementById('melee-cooldown-progress');
    if (!cooldownProgress) return;
    
    const currentTime = performance.now() / 1000;
    const elapsedTime = currentTime - this.lastMeleeTime;
    
    if (elapsedTime < this.meleeCooldown) {
      // Still on cooldown
      const progress = elapsedTime / this.meleeCooldown;
      cooldownProgress.style.transform = `scaleX(${progress})`;
      this.meleeCooldownIndicator.style.display = 'block';
    } else {
      // Cooldown complete
      cooldownProgress.style.transform = 'scaleX(1)';
      
      // Hide after a short delay
      if (elapsedTime > this.meleeCooldown + 1) {
        this.meleeCooldownIndicator.style.display = 'none';
      }
    }
  }
  
  private updateShootCooldownIndicator(): void {
    if (!this.shootCooldownIndicator) return;
    
    const cooldownProgress = document.getElementById('shoot-cooldown-progress');
    if (!cooldownProgress) return;
    
    const currentTime = performance.now() / 1000;
    const elapsedTime = currentTime - this.lastShootTime;
    const shootCooldown = this.player.getWeapon().cooldown;
    
    if (elapsedTime < shootCooldown) {
      // Still on cooldown
      const progress = elapsedTime / shootCooldown;
      cooldownProgress.style.transform = `scaleX(${progress})`;
      this.shootCooldownIndicator.style.display = 'block';
    } else {
      // Cooldown complete
      cooldownProgress.style.transform = 'scaleX(1)';
      
      // Hide after a short delay
      if (elapsedTime > shootCooldown + 1) {
        this.shootCooldownIndicator.style.display = 'none';
      }
    }
  }

  /**
   * Apply a camera shake effect
   * @param intensity How strong the shake is
   * @param duration How long the shake lasts in seconds
   */
  private applyCameraShake(intensity: number, duration: number): void {
    const camera = this.renderingSystem.getCamera();
    const originalPosition = camera.position.clone();
    
    let elapsed = 0;
    const shakeInterval = 1/60; // 60fps
    const maxShakeTime = duration;
    
    // Store original camera position
    const startPos = {
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z
    };
    
    // Function to apply a single shake step
    const applyShake = () => {
      elapsed += shakeInterval;
      
      if (elapsed < maxShakeTime) {
        // Calculate shake intensity that decreases over time
        const currentIntensity = intensity * (1 - elapsed / maxShakeTime);
        
        // Apply random offset to camera
        camera.position.set(
          startPos.x + (Math.random() - 0.5) * currentIntensity,
          startPos.y + (Math.random() - 0.5) * currentIntensity,
          startPos.z + (Math.random() - 0.5) * currentIntensity
        );
        
        // Schedule next shake
        setTimeout(applyShake, shakeInterval * 1000);
      } else {
        // Reset to original position when done
        camera.position.copy(originalPosition);
      }
    };
    
    // Start the shake effect
    applyShake();
  }

  /**
   * Show feedback when player is out of ammo
   */
  private showOutOfAmmoFeedback(): void {
    // Create a text indicator
    const ammoText = document.createElement('div');
    ammoText.textContent = 'OUT OF AMMO - PRESS R TO RELOAD';
    ammoText.style.position = 'absolute';
    ammoText.style.top = '50%';
    ammoText.style.left = '50%';
    ammoText.style.transform = 'translate(-50%, -50%)';
    ammoText.style.color = 'red';
    ammoText.style.fontWeight = 'bold';
    ammoText.style.fontSize = '24px';
    ammoText.style.textShadow = '2px 2px 4px black';
    ammoText.style.pointerEvents = 'none';
    ammoText.style.userSelect = 'none';
    ammoText.style.opacity = '0.8';
    
    document.body.appendChild(ammoText);
    
    // Fade out and remove
    setTimeout(() => {
      let opacity = 0.8;
      const fadeInterval = setInterval(() => {
        opacity -= 0.1;
        ammoText.style.opacity = opacity.toString();
        
        if (opacity <= 0) {
          clearInterval(fadeInterval);
          document.body.removeChild(ammoText);
        }
      }, 50);
    }, 1000);
  }

  // Add this new method after cleanupDeadZombies
  private checkPlayerZombieCollision(newPlayerX: number, newPlayerY: number): { x: number, y: number, collision: boolean } {
    // Get current player position
    const playerPos = this.player.getMesh().position;
    const currentX = playerPos.x;
    const currentY = playerPos.z;
    
    // Check if the player's next position would collide with any zombie
    const collisionBuffer = 0.7; // Match zombie attack range to prevent walking through
    let minDistance = Number.MAX_VALUE;
    let closestZombie: Zombie | null = null;
    
    // First check if there's a collision and find the closest zombie
    for (const zombie of this.zombies) {
      if (!zombie.isAlive) continue;
      
      // Calculate distance between player's potential new position and zombie
      const dx = newPlayerX - zombie.x;
      const dz = newPlayerY - zombie.y;
      const distance = Math.sqrt(dx * dx + dz * dz);
      
      // If distance is less than buffer, there's a collision
      if (distance < collisionBuffer && distance < minDistance) {
        minDistance = distance;
        closestZombie = zombie;
      }
    }
    
    // If no collision, return the original position
    if (!closestZombie) {
      return { x: newPlayerX, y: newPlayerY, collision: false };
    }
    
    // We have a collision, calculate sliding movement
    const zombieX = closestZombie.x;
    const zombieY = closestZombie.y;
    
    // Get the movement vector
    const moveDirX = newPlayerX - currentX;
    const moveDirY = newPlayerY - currentY;
    const moveDist = Math.sqrt(moveDirX * moveDirX + moveDirY * moveDirY);
    
    // If not moving, return current position
    if (moveDist < 0.0001) {
      return { x: currentX, y: currentY, collision: true };
    }
    
    // Direction to the zombie from the attempted position
    const toZombieX = zombieX - newPlayerX;
    const toZombieY = zombieY - newPlayerY;
    const toZombieDist = Math.sqrt(toZombieX * toZombieX + toZombieY * toZombieY);
    
    // Normalize the vector to the zombie
    const normalizedToZombieX = toZombieX / toZombieDist;
    const normalizedToZombieY = toZombieY / toZombieDist;
    
    // Calculate the overlap distance (how much we need to move away from the zombie)
    const overlap = collisionBuffer - toZombieDist;
    
    // Push the player away from the zombie to the collision boundary
    const collisionBoundaryX = newPlayerX - normalizedToZombieX * overlap;
    const collisionBoundaryY = newPlayerY - normalizedToZombieY * overlap;
    
    // Calculate dot product between movement direction and collision normal
    // This tells us how much of the movement is going into the zombie
    const normalizedMoveDirX = moveDirX / moveDist;
    const normalizedMoveDirY = moveDirY / moveDist;
    const dot = normalizedMoveDirX * normalizedToZombieX + normalizedMoveDirY * normalizedToZombieY;
    
    // Calculate the slide direction (perpendicular to collision normal)
    // This is the tangent direction along the collision surface
    const slideX = normalizedMoveDirX - normalizedToZombieX * dot;
    const slideY = normalizedMoveDirY - normalizedToZombieY * dot;
    const slideMag = Math.sqrt(slideX * slideX + slideY * slideY);
    
    // If slide magnitude is too small, just return the collision boundary
    if (slideMag < 0.0001) {
      return { x: collisionBoundaryX, y: collisionBoundaryY, collision: true };
    }
    
    // Normalize the slide direction
    const normalizedSlideX = slideX / slideMag;
    const normalizedSlideY = slideY / slideMag;
    
    // Calculate how far we can move along the slide direction
    // Use the full movement distance to allow sliding at the same speed
    const slideDistanceX = normalizedSlideX * moveDist;
    const slideDistanceY = normalizedSlideY * moveDist;
    
    // Calculate final position after sliding
    const finalX = collisionBoundaryX + slideDistanceX;
    const finalY = collisionBoundaryY + slideDistanceY;
    
    // Double-check that the final sliding position doesn't collide with any other zombies
    for (const zombie of this.zombies) {
      if (!zombie.isAlive || zombie === closestZombie) continue;
      
      const dx = finalX - zombie.x;
      const dz = finalY - zombie.y;
      const distance = Math.sqrt(dx * dx + dz * dz);
      
      if (distance < collisionBuffer) {
        // If sliding would cause another collision, just return the collision boundary
        return { x: collisionBoundaryX, y: collisionBoundaryY, collision: true };
      }
    }
    
    return { x: finalX, y: finalY, collision: true };
  }
}

export default GameEngine;