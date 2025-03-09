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
  private zombieSpawnRate: number = 15; // Seconds between zombie spawns
  private maxZombies: number = 10;
  private gameScore: number = 0;
  private gameOver: boolean = false;
  private debugMode: boolean = false; // For testing and debugging
  private respawnCountdown: number = 0; // Respawn timer in seconds
  private respawnTime: number = 5; // Reduced from 10 to 5 seconds
  private respawnText: THREE.Mesh | null = null; // 3D text for respawn countdown
  private playerDead: boolean = false; // Track if player is currently dead
  private scoreboardElement: HTMLElement | null = null; // Scoreboard DOM element
  private mobileControlsElement: HTMLElement | null = null; // Mobile controls DOM element
  private isMobile: boolean = false; // Detect if using mobile device

  constructor() {
    this.renderingSystem = new RenderingSystem();
    this.inputSystem = new InputSystem();
    this.uiSystem = new UISystem(this.renderingSystem.getScene());
    this.isMobile = this.detectMobile();
    this.player = new Player();
    this.renderingSystem.addToScene(this.player.getMesh());
    this.uiSystem.createHealthBar(this.player, true);
    this.createScoreboard();
    if (this.isMobile) {
      this.createMobileControls();
    }
    this.spawnInitialZombies(5);
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
    window.addEventListener('resize', this.handleWindowResize.bind(this));
    console.log('Game engine initialized with', this.zombies.length, 'zombies');
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
    controlsContainer.style.position = 'absolute';
    controlsContainer.style.bottom = '20px';
    controlsContainer.style.left = '0';
    controlsContainer.style.width = '100%';
    controlsContainer.style.display = 'flex';
    controlsContainer.style.justifyContent = 'space-between';
    controlsContainer.style.pointerEvents = 'none';
    controlsContainer.style.zIndex = '1000';
    
    const joystickContainer = document.createElement('div');
    joystickContainer.id = 'joystick-container';
    joystickContainer.style.width = '150px';
    joystickContainer.style.height = '150px';
    joystickContainer.style.marginLeft = '20px';
    joystickContainer.style.borderRadius = '50%';
    joystickContainer.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
    joystickContainer.style.position = 'relative';
    joystickContainer.style.pointerEvents = 'auto';
    
    const joystickKnob = document.createElement('div');
    joystickKnob.id = 'joystick-knob';
    joystickKnob.style.width = '60px';
    joystickKnob.style.height = '60px';
    joystickKnob.style.borderRadius = '50%';
    joystickKnob.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
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
    
    const shootButton = document.createElement('div');
    shootButton.id = 'shoot-button';
    shootButton.style.width = '80px';
    shootButton.style.height = '80px';
    shootButton.style.borderRadius = '50%';
    shootButton.style.backgroundColor = 'rgba(255, 0, 0, 0.6)';
    shootButton.style.display = 'flex';
    shootButton.style.justifyContent = 'center';
    shootButton.style.alignItems = 'center';
    shootButton.style.fontSize = '14px';
    shootButton.style.fontWeight = 'bold';
    shootButton.style.color = 'white';
    shootButton.style.pointerEvents = 'auto';
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
    if (!this.mobileControlsElement) return;
    
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    
    const joystickContainer = document.getElementById('joystick-container');
    if (joystickContainer) {
      const size = Math.min(screenWidth * 0.3, 150);
      joystickContainer.style.width = `${size}px`;
      joystickContainer.style.height = `${size}px`;
    }
    
    const shootButton = document.getElementById('shoot-button');
    if (shootButton) {
      const size = Math.min(screenWidth * 0.2, 80);
      shootButton.style.width = `${size}px`;
      shootButton.style.height = `${size}px`;
    }
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
    if (this.zombies.length >= this.maxZombies) return;
    
    const radius = 50 + Math.random() * 20;
    const angle = Math.random() * Math.PI * 2;
    
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    
    this.spawnZombieAt(x, z);
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

  private createRespawnCountdownText(): void {
    if (this.respawnText) {
      this.renderingSystem.removeFromScene(this.respawnText);
      this.respawnText = null;
    }

    const tempGeometry = new THREE.PlaneGeometry(5, 1);
    const textMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    });
    
    this.respawnText = new THREE.Mesh(tempGeometry, textMaterial);
    this.respawnText.position.set(0, 5, 0);
    this.renderingSystem.addToScene(this.respawnText);
    
    const respawnDiv = document.createElement('div');
    respawnDiv.id = 'respawn-countdown';
    respawnDiv.style.position = 'absolute';
    respawnDiv.style.top = '50%';
    respawnDiv.style.left = '50%';
    respawnDiv.style.transform = 'translate(-50%, -50%)';
    respawnDiv.style.color = 'red';
    respawnDiv.style.fontSize = '48px';
    respawnDiv.style.fontWeight = 'bold';
    respawnDiv.style.textShadow = '2px 2px 4px #000000';
    respawnDiv.style.padding = '20px';
    respawnDiv.style.background = 'rgba(0, 0, 0, 0.5)';
    respawnDiv.style.borderRadius = '10px';
    respawnDiv.style.zIndex = '1000';
    respawnDiv.textContent = `Respawning in ${Math.ceil(this.respawnCountdown)} seconds`;
    
    document.body.appendChild(respawnDiv);
  }
  
  private updateRespawnCountdown(deltaTime: number): void {
    if (!this.playerDead) return;
    
    this.respawnCountdown -= deltaTime;
    
    const respawnDiv = document.getElementById('respawn-countdown');
    if (respawnDiv) {
      respawnDiv.textContent = `Respawning in ${Math.ceil(this.respawnCountdown)} seconds`;
    }
    
    if (this.respawnCountdown <= 0) {
      this.respawnPlayer();
    }
  }
  
  private respawnPlayer(): void {
    const respawnDiv = document.getElementById('respawn-countdown');
    if (respawnDiv) {
      document.body.removeChild(respawnDiv);
    }
    
    if (this.respawnText) {
      this.renderingSystem.removeFromScene(this.respawnText);
      this.respawnText = null;
    }
    
    const spawnPosition = this.findSafeSpawnLocation();
    
    this.player.revive();
    this.player.updatePosition(spawnPosition.x, spawnPosition.z);
    
    this.uiSystem.updateHealthBar(this.player);
    
    this.updateScoreboard();
    
    if (!this.renderingSystem.getScene().children.includes(this.player.getMesh())) {
      this.renderingSystem.addToScene(this.player.getMesh());
    }
    
    this.playerDead = false;
    this.gameOver = false;
    
    console.log(`Player respawned at position (${spawnPosition.x}, 0, ${spawnPosition.z})`);
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

  public start(): void {
    this.lastTime = performance.now();
    requestAnimationFrame(this.loop.bind(this));
    console.log('Game started!');
  }

  private loop(currentTime: number): void {
    if (this.gameOver) return;
    
    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;
    
    this.zombieSpawnTime += deltaTime;
    if (this.zombieSpawnTime >= this.zombieSpawnRate) {
      this.spawnZombie();
      this.zombieSpawnTime = 0;
      
      console.log('Active zombies:', this.zombies.length);
    }
    
    this.player.update(deltaTime, this.inputSystem);
    this.uiSystem.updateHealthBar(this.player);
    
    const playerPos = this.player.getMesh().position;
    
    for (let i = 0; i < this.zombies.length; i++) {
      const zombie = this.zombies[i];
      
      if (!zombie.isAlive) continue;
      
      zombie.update(deltaTime, playerPos);
      this.uiSystem.updateHealthBar(zombie);
      
      const zombiePos = zombie.getMesh().position;
      const dx = playerPos.x - zombiePos.x;
      const dz = playerPos.z - zombiePos.z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      
      if (distance < 1.5) {
        this.player.takeDamage(10 * deltaTime);
        
        if (!this.player.isAlive) {
          this.handlePlayerDeath();
        }
      }
    }
    
    this.renderingSystem.setCameraPosition(playerPos.x, 20, playerPos.z);
    
    this.uiSystem.update(this.renderingSystem.getCamera());
    
    this.renderingSystem.render();
    
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
    if (this.gameOver) return;
    
    const playerPos = this.player.getMesh().position;
    const direction = this.player.getForwardDirection();
    
    const bulletStart = new THREE.Vector3(playerPos.x, playerPos.y + 1, playerPos.z);
    const bulletEnd = new THREE.Vector3(
      playerPos.x + direction.x * 50,
      playerPos.y + direction.y * 50 + 1,
      playerPos.z + direction.z * 50
    );
    
    const points = [bulletStart, bulletEnd];
    const bulletGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const bulletMaterial = new THREE.LineBasicMaterial({ color: 0xffff00 });
    const bulletTrail = new THREE.Line(bulletGeometry, bulletMaterial);
    
    this.renderingSystem.addToScene(bulletTrail);
    
    setTimeout(() => {
      this.renderingSystem.removeFromScene(bulletTrail);
    }, 100);
    
    const raycaster = new THREE.Raycaster(bulletStart, direction.normalize());
    
    for (const zombie of this.zombies) {
      if (!zombie.isAlive) continue;
      
      const zombiePos = zombie.getMesh().position;
      
      const toZombie = new THREE.Vector3(
        zombiePos.x - playerPos.x,
        0,
        zombiePos.z - playerPos.z
      ).normalize();
      
      const dot = direction.dot(toZombie);
      
      if (dot > 0.866) {
        const distance = new THREE.Vector3(
          zombiePos.x - playerPos.x,
          zombiePos.y - playerPos.y,
          zombiePos.z - playerPos.z
        ).length();
        
        if (distance < 20) {
          zombie.takeDamage(25);
          this.uiSystem.updateHealthBar(zombie);
          
          if (!zombie.isAlive) {
            this.gameScore += 100;
            this.player.addKill();
            this.updateScoreboard();
            
            console.log('Score: ' + this.gameScore);
            
            setTimeout(() => {
              this.uiSystem.removeHealthBar(zombie);
              this.renderingSystem.removeFromScene(zombie.getMesh());
              
              const index = this.zombies.indexOf(zombie);
              if (index > -1) {
                this.zombies.splice(index, 1);
              }
            }, 3000);
          }
          
          break;
        }
      }
    }
  }

  private handlePlayerDeath(): void {
    this.gameOver = true;
    this.playerDead = true;
    
    console.log('Player died! Score: ' + this.gameScore);
    
    this.respawnCountdown = this.respawnTime;
    this.createRespawnCountdownText();
    
    const deathMessage = document.createElement('div');
    deathMessage.id = 'death-message';
    deathMessage.style.position = 'absolute';
    deathMessage.style.top = '40%';
    deathMessage.style.left = '50%';
    deathMessage.style.transform = 'translate(-50%, -50%)';
    deathMessage.style.color = 'red';
    deathMessage.style.fontSize = '64px';
    deathMessage.style.fontWeight = 'bold';
    deathMessage.style.textShadow = '2px 2px 4px #000000';
    deathMessage.textContent = 'YOU DIED';
    
    document.body.appendChild(deathMessage);
    
    setTimeout(() => {
      const deathMsg = document.getElementById('death-message');
      if (deathMsg) {
        document.body.removeChild(deathMsg);
      }
    }, 3000);
  }

  public stop(): void {
    window.removeEventListener('keydown', this.handleKeyDown.bind(this));
    window.removeEventListener('resize', this.handleWindowResize.bind(this));
    
    const respawnDiv = document.getElementById('respawn-countdown');
    if (respawnDiv) {
      document.body.removeChild(respawnDiv);
    }
    
    const deathMessage = document.getElementById('death-message');
    if (deathMessage) {
      document.body.removeChild(deathMessage);
    }
    
    if (this.scoreboardElement) {
      document.body.removeChild(this.scoreboardElement);
    }
    
    this.uiSystem.cleanup();
    
    this.gameOver = true;
    console.log('Game stopped!');
  }
}

export default GameEngine;