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
  private maxZombies: number = 50; // Increased to allow more zombies on screen
  private difficultyScalingFactor: number = 0.95; // How quickly difficulty increases (< 1.0)
  private difficultyIncreaseInterval: number = 10; // Seconds between difficulty increases
  private timeSinceLastDifficultyIncrease: number = 0;
  private minSpawnRate: number = 0.5; // Fastest possible spawn rate (seconds)
  private waveNumber: number = 1; // Track the current wave number
  private gameScore: number = 0;
  private gameOver: boolean = false;
  private debugMode: boolean = false; // For testing and debugging
  private respawnCountdown: number = 0; // Respawn timer in seconds
  private respawnTime: number = 5; // Reduced from 10 to 5 seconds
  private playerDead: boolean = false; // Track if player is currently dead
  private scoreboardElement: HTMLElement | null = null; // Scoreboard DOM element
  private mobileControlsElement: HTMLElement | null = null; // Mobile controls DOM element
  private isMobile: boolean = false; // Detect if using mobile device
  private waveIndicatorElement: HTMLElement | null = null; // Wave indicator element

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
    
    // Create unified UI container first
    this.createUnifiedUI();
    
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
    if (this.mobileControlsElement) {
      document.body.removeChild(this.mobileControlsElement);
    }
    
    const controlsContainer = document.createElement('div');
    controlsContainer.id = 'mobile-controls';
    controlsContainer.style.position = 'fixed';
    controlsContainer.style.bottom = '20px';
    controlsContainer.style.left = '0';
    controlsContainer.style.width = '100%';
    controlsContainer.style.display = 'flex';
    controlsContainer.style.justifyContent = 'space-between';
    controlsContainer.style.pointerEvents = 'none';
    controlsContainer.style.zIndex = '1000';
    
    const joystickContainer = document.createElement('div');
    joystickContainer.id = 'joystick-container';
    joystickContainer.style.width = '120px';
    joystickContainer.style.height = '120px';
    joystickContainer.style.marginLeft = '20px';
    joystickContainer.style.marginBottom = '20px';
    joystickContainer.style.borderRadius = '50%';
    joystickContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
    joystickContainer.style.border = '2px solid rgba(255, 255, 255, 0.5)';
    joystickContainer.style.position = 'relative';
    joystickContainer.style.pointerEvents = 'auto';
    
    const joystickKnob = document.createElement('div');
    joystickKnob.id = 'joystick-knob';
    joystickKnob.style.width = '50px';
    joystickKnob.style.height = '50px';
    joystickKnob.style.borderRadius = '50%';
    joystickKnob.style.backgroundColor = 'rgba(255, 255, 255, 0.7)';
    joystickKnob.style.border = '2px solid rgba(0, 0, 0, 0.3)';
    joystickKnob.style.position = 'absolute';
    joystickKnob.style.top = '50%';
    joystickKnob.style.left = '50%';
    joystickKnob.style.transform = 'translate(-50%, -50%)';
    joystickKnob.style.pointerEvents = 'none';
    
    joystickContainer.appendChild(joystickKnob);
    
    const actionsContainer = document.createElement('div');
    actionsContainer.id = 'actions-container';
    actionsContainer.style.display = 'flex';
    actionsContainer.style.flexDirection = 'column';
    actionsContainer.style.gap = '15px';
    actionsContainer.style.marginRight = '20px';
    actionsContainer.style.marginBottom = '20px';
    
    const shootButton = document.createElement('div');
    shootButton.id = 'shoot-button';
    shootButton.style.width = '80px';
    shootButton.style.height = '80px';
    shootButton.style.borderRadius = '50%';
    shootButton.style.backgroundColor = 'rgba(255, 50, 50, 0.7)';
    shootButton.style.border = '2px solid rgba(255, 255, 255, 0.5)';
    shootButton.style.display = 'flex';
    shootButton.style.justifyContent = 'center';
    shootButton.style.alignItems = 'center';
    shootButton.style.fontSize = '16px';
    shootButton.style.fontWeight = 'bold';
    shootButton.style.color = 'white';
    shootButton.style.pointerEvents = 'auto';
    shootButton.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
    shootButton.textContent = 'SHOOT';
    
    actionsContainer.appendChild(shootButton);
    
    controlsContainer.appendChild(joystickContainer);
    controlsContainer.appendChild(actionsContainer);
    
    document.body.appendChild(controlsContainer);
    
    this.mobileControlsElement = controlsContainer;
    
    this.setupMobileControlsEvents(joystickContainer, shootButton);
  }
  
  private setupMobileControlsEvents(joystickContainer: HTMLElement, shootButton: HTMLElement): void {
    let isJoystickActive = false;
    let joystickOrigin = { x: 0, y: 0 };
    const knob = document.getElementById('joystick-knob');
    const joystickMaxDistance = 40; // Max distance the joystick can move
    
    // Joystick touch events
    joystickContainer.addEventListener('touchstart', (e) => {
      isJoystickActive = true;
      const touch = e.touches[0];
      const rect = joystickContainer.getBoundingClientRect();
      joystickOrigin.x = touch.clientX - rect.left;
      joystickOrigin.y = touch.clientY - rect.top;
      
      // Set knob position
      if (knob) {
        knob.style.left = `${joystickOrigin.x}px`;
        knob.style.top = `${joystickOrigin.y}px`;
        knob.style.transform = 'translate(-50%, -50%)';
      }
      
      e.preventDefault();
    });
    
    joystickContainer.addEventListener('touchmove', (e) => {
      if (!isJoystickActive || !knob) return;
      
      const touch = e.touches[0];
      const rect = joystickContainer.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      
      // Calculate direction vector
      let dx = x - joystickOrigin.x;
      let dy = y - joystickOrigin.y;
      
      // Normalize if exceeds max distance
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > joystickMaxDistance) {
        dx = dx / distance * joystickMaxDistance;
        dy = dy / distance * joystickMaxDistance;
      }
      
      // Update knob position
      knob.style.left = `${joystickOrigin.x + dx}px`;
      knob.style.top = `${joystickOrigin.y + dy}px`;
      
      // Update input system with normalized direction
      const normalizedDx = dx / joystickMaxDistance;
      const normalizedDy = dy / joystickMaxDistance;
      this.inputSystem.setMobileJoystickInput(normalizedDx, normalizedDy);
      
      e.preventDefault();
    });
    
    joystickContainer.addEventListener('touchend', () => {
      isJoystickActive = false;
      
      // Reset knob position
      if (knob) {
        knob.style.left = '50%';
        knob.style.top = '50%';
        knob.style.transform = 'translate(-50%, -50%)';
      }
      
      // Reset input
      this.inputSystem.setMobileJoystickInput(0, 0);
    });
    
    // Shoot button events
    shootButton.addEventListener('touchstart', (e) => {
      // Set input state
      this.inputSystem.setMobileButtonInput('shoot', true);
      
      // Visual feedback
      shootButton.style.transform = 'scale(0.9)';
      shootButton.style.backgroundColor = 'rgba(255, 0, 0, 0.8)';
      
      // Perform shoot action
      this.shootZombie();
      
      e.preventDefault();
    });
    
    shootButton.addEventListener('touchend', (e) => {
      // Reset input state
      this.inputSystem.setMobileButtonInput('shoot', false);
      
      // Reset visual state
      shootButton.style.transform = 'scale(1)';
      shootButton.style.backgroundColor = 'rgba(255, 0, 0, 0.6)';
      
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
    uiContainer.style.top = '10px';
    uiContainer.style.left = '10px';
    uiContainer.style.right = '10px';
    uiContainer.style.display = 'flex';
    uiContainer.style.justifyContent = 'space-between';
    uiContainer.style.alignItems = 'flex-start';
    uiContainer.style.pointerEvents = 'none';
    uiContainer.style.zIndex = '1000';
    
    // Create left panel for scoreboard
    const leftPanel = document.createElement('div');
    leftPanel.id = 'game-ui-left-panel';
    leftPanel.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    leftPanel.style.borderRadius = '5px';
    leftPanel.style.padding = '10px';
    leftPanel.style.color = 'white';
    leftPanel.style.fontFamily = 'Arial, sans-serif';
    leftPanel.style.fontSize = '14px';
    leftPanel.style.pointerEvents = 'auto';
    
    // Create center panel for notifications
    const centerPanel = document.createElement('div');
    centerPanel.id = 'game-ui-center-panel';
    centerPanel.style.display = 'flex';
    centerPanel.style.flexDirection = 'column';
    centerPanel.style.alignItems = 'center';
    centerPanel.style.gap = '10px';
    
    // Create right panel for player count and wave info
    const rightPanel = document.createElement('div');
    rightPanel.id = 'game-ui-right-panel';
    rightPanel.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    rightPanel.style.borderRadius = '5px';
    rightPanel.style.padding = '10px';
    rightPanel.style.color = 'white';
    rightPanel.style.fontFamily = 'Arial, sans-serif';
    rightPanel.style.fontSize = '14px';
    rightPanel.style.display = 'flex';
    rightPanel.style.flexDirection = 'column';
    rightPanel.style.gap = '5px';
    rightPanel.style.pointerEvents = 'auto';
    
    // Add panels to container
    uiContainer.appendChild(leftPanel);
    uiContainer.appendChild(centerPanel);
    uiContainer.appendChild(rightPanel);
    
    // Add container to document
    document.body.appendChild(uiContainer);
    
    // Create scoreboard in left panel
    this.createScoreboard(leftPanel);
    
    // Create wave indicator and player count in right panel
    this.createWaveIndicator(rightPanel);
  }
  
  /**
   * Create the scoreboard to display player stats
   */
  private createScoreboard(container: HTMLElement): void {
    // Create scoreboard content
    const scoreElement = document.createElement('div');
    scoreElement.innerHTML = `<strong>Score:</strong> <span id="score-value">0</span>`;
    
    const healthElement = document.createElement('div');
    healthElement.innerHTML = `<strong>Health:</strong> <span id="health-value">${this.player.health}/${this.player.maxHealth}</span>`;
    
    const killsElement = document.createElement('div');
    killsElement.innerHTML = `<strong>Kills:</strong> <span id="kills-value">0</span>`;
    
    const timeElement = document.createElement('div');
    timeElement.innerHTML = `<strong>Time:</strong> <span id="time-value">0:00</span>`;
    
    // Add elements to the container
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
    waveElement.innerHTML = `<strong>Wave:</strong> <span id="wave-value">${this.waveNumber}</span>`;
    
    // Create player count element (will be updated by NetworkSystem)
    const playersElement = document.createElement('div');
    playersElement.id = 'active-players';
    playersElement.innerHTML = `<strong>Players Online:</strong> <span id="players-value">1</span>`;
    
    // Add elements to the container
    container.appendChild(waveElement);
    container.appendChild(playersElement);
    
    // Store reference to the wave indicator
    this.waveIndicatorElement = waveElement;
    
    // Set initial player count
    this.uiSystem.setActivePlayers(1);
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
      this.waveIndicatorElement.style.backgroundColor = 'rgba(255, 87, 34, 0.7)';
      setTimeout(() => {
        if (this.waveIndicatorElement) {
          this.waveIndicatorElement.style.backgroundColor = 'transparent';
        }
      }, 2000);
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
    messageElement.textContent = 'Running in single-player mode (server not available)';
    
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
    if (this.zombies.length >= this.maxZombies) {
      this.removeOldestDistantZombie();
    }
    
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
      
      if (this.respawnCountdown <= 0) {
        this.respawnPlayer();
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
    // Clean up any existing respawn UI elements
    this.cleanupRespawnUI();
    
    // Reset player state
    this.gameOver = false;
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
    this.waveNumber++;
    
    this.zombieSpawnRate = Math.max(
      this.minSpawnRate,
      this.zombieSpawnRate * this.difficultyScalingFactor
    );
    
    const waveZombies = Math.min(this.waveNumber + 2, 10);
    for (let i = 0; i < waveZombies; i++) {
      setTimeout(() => {
        this.spawnZombie();
      }, i * 500);
    }
    
    this.updateWaveIndicator(true);
    
    this.showWaveNotification();
  }
  
  private showWaveNotification(): void {
    const notification = document.createElement('div');
    notification.id = 'wave-notification';
    notification.style.position = 'absolute';
    notification.style.top = '40%';
    notification.style.left = '50%';
    notification.style.transform = 'translate(-50%, -50%)';
    notification.style.color = 'red';
    notification.style.fontSize = '48px';
    notification.style.fontWeight = 'bold';
    notification.style.textShadow = '2px 2px 4px #000000';
    notification.style.zIndex = '1001';
    notification.style.transition = 'opacity 0.5s ease-in-out, transform 0.5s ease-in-out';
    notification.style.opacity = '0';
    notification.style.textAlign = 'center';
    notification.innerHTML = `<div>Wave ${this.waveNumber}</div><div style="font-size: 24px;">They're getting faster!</div>`;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.opacity = '1';
    }, 10);
    
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translate(-50%, -70%)';
      
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 500);
    }, 2500);
  }

  public start(): void {
    this.lastTime = performance.now();
    requestAnimationFrame(this.loop.bind(this));
    console.log('Game started!');
  }

  private loop(currentTime: number): void {
    // Calculate delta time in seconds
    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;
    
    // Skip if delta time is too large (e.g. after tab switch)
    if (deltaTime > 0.5) {
      requestAnimationFrame(this.loop.bind(this));
      return;
    }
    
    // Update input system
    this.inputSystem.update();
    
    // Update player if alive
    if (this.player.isAlive) {
      this.player.update(deltaTime, this.inputSystem);
      
      // Send player position update to server every 100ms
      if (Math.random() < 0.1) { // Approximately every 10 frames at 60fps
        const position = this.player.getMesh().position;
        const rotation = this.player.getMesh().rotation.y;
        this.networkSystem.sendPlayerUpdate(
          { x: position.x, y: position.y, z: position.z },
          rotation
        );
      }
    } else if (this.playerDead) {
      // Handle respawn countdown
      this.updateRespawnCountdown(deltaTime);
    }
      
      // Update zombie spawning
      this.zombieSpawnTime += deltaTime;
      if (this.zombieSpawnTime >= this.zombieSpawnRate && this.zombies.length < this.maxZombies) {
        this.spawnZombie();
        this.zombieSpawnTime = 0;
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
          if (distance < 1.5 && this.player.isAlive) {
            const damage = 5 * deltaTime; // Damage scaled by time
            this.player.takeDamage(damage);
            
            // Check if player died from this attack
            if (!this.player.isAlive) {
              this.handlePlayerDeath();
            }
          }
        }
      }
      
      // Update scoreboard
      this.updateScoreboard();
      
      // Scale difficulty over time
      this.timeSinceLastDifficultyIncrease += deltaTime;
      if (this.timeSinceLastDifficultyIncrease >= this.difficultyIncreaseInterval) {
        this.increaseDifficulty();
        this.timeSinceLastDifficultyIncrease = 0;
      }
      
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
    
    // Continue game loop
    requestAnimationFrame(this.loop.bind(this));
  }
  
  private handleKeyDown(event: KeyboardEvent): void {
    if (this.playerDead) {
      if (event.code === 'KeyR') {
        this.respawnCountdown = 0;
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
    
    // Create bullet effect from player
    const playerMesh = this.player.getMesh();
    
    // Get the weapon position for bullet start
    let bulletStart = new THREE.Vector3(
      playerMesh.position.x,
      playerMesh.position.y + 0.75, // Adjust height to be at "gun" level
      playerMesh.position.z
    );
    
    // Get direction player is facing
    const direction = this.player.getForwardDirection();
    
    // Define bullet damage
    const bulletDamage = 50; // High damage - one shot kills most zombies
    
    // Create a bullet trail effect
    this.createBulletTrail(bulletStart, direction);
    
    // SIMPLIFIED APPROACH: Find zombies in front of the player within a certain range and angle
    const maxRange = 50;
    const maxAngleCos = 0.95; // About 18 degrees cone - narrower for more precise hits
    
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
    this.gameOver = true;
    this.playerDead = true;
    
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
      // Mobile version with button
      respawnControlsHTML = `
        <div id="respawn-countdown" style="color: red; font-size: 64px; font-weight: bold; margin-bottom: 20px;">${Math.ceil(this.respawnCountdown)}</div>
        <button id="respawn-button" style="
          background-color: #ff3333;
          color: white;
          border: none;
          padding: 15px 30px;
          border-radius: 50px;
          font-size: 18px;
          font-weight: bold;
          margin-top: 10px;
          box-shadow: 0 4px 8px rgba(0,0,0,0.3);
          cursor: pointer;
          width: 80%;
          transition: background-color 0.2s;
          -webkit-tap-highlight-color: transparent;
        ">RESPAWN NOW</button>
      `;
    } else {
      // Desktop version with keyboard instruction
      respawnControlsHTML = `
        <div id="respawn-countdown" style="color: red; font-size: 64px; font-weight: bold; margin-bottom: 20px;">${Math.ceil(this.respawnCountdown)}</div>
        <div style="font-size: 16px; color: #aaa;">Press R to respawn immediately</div>
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
    
    // Add event listener for the respawn button if on mobile
    if (this.isMobile) {
      const respawnButton = document.getElementById('respawn-button');
      if (respawnButton) {
        // Add active state styling for touch feedback
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
          this.respawnCountdown = 0; // Trigger immediate respawn
        });
      }
    }
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
    const notification = document.createElement('div');
    notification.id = 'reset-notification';
    notification.style.position = 'absolute';
    notification.style.top = '40%';
    notification.style.left = '50%';
    notification.style.transform = 'translate(-50%, -50%)';
    notification.style.color = 'white';
    notification.style.fontSize = '36px';
    notification.style.fontWeight = 'bold';
    notification.style.textShadow = '2px 2px 4px #000000';
    notification.style.zIndex = '1001';
    notification.style.transition = 'opacity 0.5s ease-in-out, transform 0.5s ease-in-out';
    notification.style.opacity = '0';
    notification.style.textAlign = 'center';
    notification.innerHTML = `<div>Game Reset</div><div style="font-size: 24px;">Starting from Wave 1</div>`;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
      notification.style.opacity = '1';
    }, 10);
    
    // Animate out and remove after a delay
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translate(-50%, -70%)';
      
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 500);
    }, 2500);
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
    
    const waveNotification = document.getElementById('wave-notification');
    if (waveNotification) {
      document.body.removeChild(waveNotification);
    }
    
    const resetNotification = document.getElementById('reset-notification');
    if (resetNotification) {
      document.body.removeChild(resetNotification);
    }
    
    // Clean up systems
    this.uiSystem.cleanup();
    
    // Stop the game loop
    this.gameOver = true;
    console.log('Game stopped!');
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
   * Set up network event listeners for multiplayer functionality
   */
  private setupNetworkListeners(): void {
    // Listen for player count updates
    this.networkSystem.onPlayerCountUpdate((count: number) => {
      this.uiSystem.setActivePlayers(count);
    });
    
    // Listen for other player updates
    this.networkSystem.onPlayerUpdate((players: any[]) => {
      // Handle other player updates here
      console.log(`Received update for ${players.length} other players`);
    });
    
    // Show a message if running in single-player mode
    setTimeout(() => {
      if (!this.networkSystem.isServerConnected() && 
          this.networkSystem.hasConnectionBeenAttempted()) {
        this.showSinglePlayerModeMessage();
      }
    }, 3000); // Give it some time to try connecting
  }
}

export default GameEngine;