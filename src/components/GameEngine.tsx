import RenderingSystem from '../systems/RenderingSystem';
import InputSystem from '../systems/InputSystem';
import UISystem from '../systems/UISystem';
import Player from './Player';
import Zombie from './Zombie';
import * as THREE from 'three';

class GameEngine {
  private renderingSystem: RenderingSystem;
  private inputSystem: InputSystem;
  private uiSystem: UISystem;
  private player: Player;
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

  constructor() {
    this.renderingSystem = new RenderingSystem();
    this.inputSystem = new InputSystem();
    this.uiSystem = new UISystem(this.renderingSystem.getScene());
    this.isMobile = this.detectMobile();
    this.player = new Player();
    this.renderingSystem.addToScene(this.player.getMesh());
    this.uiSystem.createHealthBar(this.player, true);
    this.createScoreboard();
    this.createWaveIndicator();
    if (this.isMobile) {
      this.createMobileControls();
    }
    this.spawnInitialZombies(3);
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
    window.addEventListener('resize', this.handleWindowResize.bind(this));
    console.log('Game engine initialized with endless zombie mode');
    console.log('Mobile device detected:', this.isMobile);
  }

  private detectMobile(): boolean {
    return (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      (window.innerWidth <= 800 && window.innerHeight <= 600)
    );
  }

  private handleWindowResize(): void {
    this.updateScoreboardPosition();
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

  private createScoreboard(): void {
    if (this.scoreboardElement) {
      document.body.removeChild(this.scoreboardElement);
    }
    
    const scoreboard = document.createElement('div');
    scoreboard.id = 'scoreboard';
    scoreboard.style.position = 'absolute';
    scoreboard.style.top = '10px';
    scoreboard.style.left = '50%';
    scoreboard.style.transform = 'translateX(-50%)';
    scoreboard.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    scoreboard.style.color = 'white';
    scoreboard.style.padding = '10px 20px';
    scoreboard.style.borderRadius = '5px';
    scoreboard.style.fontFamily = 'Arial, sans-serif';
    scoreboard.style.zIndex = '1000';
    scoreboard.style.display = 'flex';
    scoreboard.style.flexWrap = 'wrap';
    scoreboard.style.justifyContent = 'center';
    scoreboard.style.maxWidth = '90%';
    scoreboard.style.width = 'fit-content';
    scoreboard.style.boxSizing = 'border-box';
    scoreboard.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
    
    const scoreElement = document.createElement('div');
    scoreElement.id = 'score-section';
    scoreElement.innerHTML = `<div>Score: <span id="score-value">${this.gameScore}</span></div>`;
    scoreElement.style.fontWeight = 'bold';
    scoreElement.style.fontSize = 'clamp(14px, 3vw, 18px)';
    scoreElement.style.margin = '0 10px';
    
    const healthElement = document.createElement('div');
    healthElement.id = 'health-section';
    healthElement.innerHTML = `<div>Health: <span id="health-value">${this.player.health}</span>/${this.player.maxHealth}</div>`;
    healthElement.style.fontWeight = 'bold';
    healthElement.style.fontSize = 'clamp(14px, 3vw, 18px)';
    healthElement.style.margin = '0 10px';
    
    const killsElement = document.createElement('div');
    killsElement.id = 'kills-section';
    killsElement.innerHTML = `<div>Kills: <span id="kills-value">${this.player.kills}</span></div>`;
    killsElement.style.fontWeight = 'bold';
    killsElement.style.fontSize = 'clamp(14px, 3vw, 18px)';
    killsElement.style.margin = '0 10px';
    
    const timerElement = document.createElement('div');
    timerElement.id = 'timer-section';
    timerElement.innerHTML = `<div>Time: <span id="timer-value">0:00</span></div>`;
    timerElement.style.fontWeight = 'bold';
    timerElement.style.fontSize = 'clamp(14px, 3vw, 18px)';
    timerElement.style.margin = '0 10px';
    
    scoreboard.appendChild(scoreElement);
    scoreboard.appendChild(healthElement);
    scoreboard.appendChild(killsElement);
    scoreboard.appendChild(timerElement);
    
    document.body.appendChild(scoreboard);
    
    this.scoreboardElement = scoreboard;
    
    this.updateScoreboardPosition();
  }
  
  private updateScoreboard(): void {
    const scoreValue = document.getElementById('score-value');
    const healthValue = document.getElementById('health-value');
    const killsValue = document.getElementById('kills-value');
    const timerValue = document.getElementById('timer-value');
    
    if (!scoreValue || !healthValue || !killsValue || !timerValue) return;
    
    scoreValue.textContent = this.gameScore.toString();
    healthValue.textContent = Math.ceil(this.player.health).toString();
    killsValue.textContent = this.player.kills.toString();
    
    const minutes = Math.floor(this.player.timeSurvived / 60);
    const seconds = Math.floor(this.player.timeSurvived % 60);
    timerValue.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    if (this.player.health < 25) {
      healthValue.style.color = 'red';
    } else if (this.player.health < 50) {
      healthValue.style.color = 'orange';
    } else {
      healthValue.style.color = 'white';
    }
  }
  
  private updateScoreboardPosition(): void {
    if (!this.scoreboardElement) return;
    
    this.scoreboardElement.style.left = '50%';
    this.scoreboardElement.style.transform = 'translateX(-50%)';
    
    const viewportWidth = window.innerWidth;
    const scoreboardWidth = this.scoreboardElement.offsetWidth;
    
    if (scoreboardWidth > viewportWidth * 0.9) {
      if (viewportWidth < 400) {
        this.scoreboardElement.style.flexDirection = 'column';
        this.scoreboardElement.style.alignItems = 'center';
      } else {
        this.scoreboardElement.style.flexDirection = 'row';
        this.scoreboardElement.style.flexWrap = 'wrap';
        this.scoreboardElement.style.justifyContent = 'center';
      }
    } else {
      this.scoreboardElement.style.flexDirection = 'row';
      this.scoreboardElement.style.flexWrap = 'nowrap';
    }
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
    
    // Find a safe location to respawn
    const safeLocation = this.findSafeSpawnLocation();
    
    // Reset player health and position
    this.player.revive();
    this.player.getMesh().position.copy(safeLocation);
    
    // Update health bar
    this.uiSystem.updateHealthBar(this.player);
    
    // Reset game difficulty when player respawns
    this.resetGameDifficulty();
    
    console.log('Player respawned at', safeLocation);
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

  private createWaveIndicator(): void {
    if (this.waveIndicatorElement) {
      document.body.removeChild(this.waveIndicatorElement);
    }
    
    const waveIndicator = document.createElement('div');
    waveIndicator.id = 'wave-indicator';
    waveIndicator.style.position = 'absolute';
    waveIndicator.style.top = '60px';
    waveIndicator.style.left = '50%';
    waveIndicator.style.transform = 'translateX(-50%)';
    waveIndicator.style.backgroundColor = 'rgba(255, 0, 0, 0.7)';
    waveIndicator.style.color = 'white';
    waveIndicator.style.padding = '8px 16px';
    waveIndicator.style.borderRadius = '5px';
    waveIndicator.style.fontFamily = 'Arial, sans-serif';
    waveIndicator.style.fontWeight = 'bold';
    waveIndicator.style.fontSize = 'clamp(16px, 3vw, 20px)';
    waveIndicator.style.zIndex = '1000';
    waveIndicator.style.transition = 'opacity 0.5s ease-in-out';
    waveIndicator.style.opacity = '1';
    waveIndicator.style.maxWidth = '90%';
    waveIndicator.style.textAlign = 'center';
    waveIndicator.innerHTML = `Wave 1 - Spawn Rate: ${this.zombieSpawnRate.toFixed(1)}s`;
    
    document.body.appendChild(waveIndicator);
    this.waveIndicatorElement = waveIndicator;
    
    setTimeout(() => {
      if (this.waveIndicatorElement) {
        this.waveIndicatorElement.style.opacity = '0';
      }
    }, 3000);
  }
  
  private updateWaveIndicator(showTemporarily: boolean = false): void {
    if (!this.waveIndicatorElement) {
      this.createWaveIndicator();
      return;
    }
    
    this.waveIndicatorElement.innerHTML = `Wave ${this.waveNumber} - Spawn Rate: ${this.zombieSpawnRate.toFixed(1)}s`;
    
    if (showTemporarily) {
      this.waveIndicatorElement.style.opacity = '1';
      
      setTimeout(() => {
        if (this.waveIndicatorElement) {
          this.waveIndicatorElement.style.opacity = '0';
        }
      }, 3000);
    }
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
    
    // Skip if more than 1 second has passed (likely tab was inactive)
    if (deltaTime > 1) {
      requestAnimationFrame(this.loop.bind(this));
      return;
    }
    
    // Only run game logic if player is alive
    if (!this.gameOver) {
      // Update player and UI
      this.player.update(deltaTime, this.inputSystem);
      this.uiSystem.updateHealthBar(this.player);
      
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
    } else if (this.playerDead) {
      // Player is dead, update respawn countdown
      this.updateRespawnCountdown(deltaTime);
    }
    
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
    const bulletStart = new THREE.Vector3(
      playerMesh.position.x,
      playerMesh.position.y + 0.75, // Adjust height to be at "gun" level
      playerMesh.position.z
    );
    
    // Get direction player is facing
    const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(playerMesh.quaternion);
    
    // Use raycaster to detect zombie hits
    const raycaster = new THREE.Raycaster(bulletStart, direction.normalize());
    const zombieMeshes = this.zombies
      .filter(z => z.isAlive)
      .map(z => z.getMesh());
    
    // Cast ray to see if we hit any zombies
    const intersects = raycaster.intersectObjects(zombieMeshes, true);
    
    // Create a bullet trail effect
    this.createBulletTrail(bulletStart, direction);
    
    if (intersects.length > 0) {
      // We hit something! 
      const hitObject = intersects[0].object;
      
      // Find which zombie was hit
      let hitZombie: Zombie | null = null;
      for (const zombie of this.zombies) {
        if (!zombie.isAlive) continue;
        
        if (zombie.getMesh() === hitObject || zombie.getMesh().children.includes(hitObject)) {
          hitZombie = zombie;
          break;
        }
      }
      
      if (hitZombie) {
        console.log('Hit zombie!');
        hitZombie.takeDamage(50); // High damage - one shot kills most zombies
        
        if (!hitZombie.isAlive) {
          // Update player kills and game score
          this.player.addKill();
          this.gameScore += 100; // Base score for zombie kill
          
          // Bonus points for distance
          const distance = hitZombie.getMesh().position.distanceTo(playerMesh.position);
          const distanceBonus = Math.floor(distance * 10);
          this.gameScore += distanceBonus;
          
          console.log(`Killed zombie at distance ${distance.toFixed(2)}m! +${100 + distanceBonus} points`);
        }
      }
    } else {
      // Missed shot
      console.log('Shot fired but missed!');
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
    
    const bulletGeometry = new THREE.BufferGeometry().setFromPoints([start, end]);
    const bulletMaterial = new THREE.LineBasicMaterial({ 
      color: 0xffff00,
      transparent: true,
      opacity: 0.8
    });
    const bulletLine = new THREE.Line(bulletGeometry, bulletMaterial);
    
    // Add the bullet trail to the scene
    this.renderingSystem.addToScene(bulletLine);
    
    // Remove the bullet trail after a short time
    setTimeout(() => {
      this.renderingSystem.removeFromScene(bulletLine);
    }, 100);
  }
}

export default GameEngine;