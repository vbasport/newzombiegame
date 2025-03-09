import RenderingSystem from '../systems/RenderingSystem';
import InputSystem from '../systems/InputSystem';
import Player from './Player';
import Zombie from './Zombie';
import * as THREE from 'three';

class GameEngine {
  private renderingSystem: RenderingSystem;
  private inputSystem: InputSystem;
  private player: Player;
  private zombies: Zombie[] = [];
  private lastTime: number = 0;
  private zombieSpawnTime: number = 0;
  private zombieSpawnRate: number = 15; // Seconds between zombie spawns
  private maxZombies: number = 10;
  private gameScore: number = 0;
  private gameOver: boolean = false;

  constructor() {
    this.renderingSystem = new RenderingSystem();
    this.inputSystem = new InputSystem();
    this.player = new Player();
    this.renderingSystem.addToScene(this.player.getMesh());
    this.spawnInitialZombies(3);
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
  }

  private spawnInitialZombies(count: number): void {
    for (let i = 0; i < count; i++) {
      this.spawnZombie();
    }
  }

  private spawnZombie(): void {
    if (this.zombies.length >= this.maxZombies) return;
    
    const radius = 50 + Math.random() * 20; // Between 50-70 units from center
    const angle = Math.random() * Math.PI * 2; // Random angle
    
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    
    const zombie = new Zombie(new THREE.Vector3(x, 0, z));
    this.zombies.push(zombie);
    this.renderingSystem.addToScene(zombie.getMesh());
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
    }
    
    this.player.update(deltaTime, this.inputSystem);
    
    const playerPos = this.player.getMesh().position;
    
    for (let i = 0; i < this.zombies.length; i++) {
      const zombie = this.zombies[i];
      
      if (!zombie.isAlive) continue;
      
      zombie.update(deltaTime, playerPos);
      
      const zombiePos = zombie.getMesh().position;
      const dx = playerPos.x - zombiePos.x;
      const dz = playerPos.z - zombiePos.z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      
      if (distance < 1.5) {
        this.player.takeDamage(10 * deltaTime);
        
        if (!this.player.isAlive) {
          this.gameOver = true;
          console.log('Game Over! Score: ' + this.gameScore);
        }
      }
    }
    
    this.renderingSystem.setCameraPosition(playerPos.x, 20, playerPos.z);
    
    this.renderingSystem.render();
    
    requestAnimationFrame(this.loop.bind(this));
  }
  
  private handleKeyDown(event: KeyboardEvent): void {
    if (event.code === 'Space') {
      this.shootZombie();
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
          
          if (!zombie.isAlive) {
            this.gameScore += 100;
            console.log('Score: ' + this.gameScore);
            
            setTimeout(() => {
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

  public stop(): void {
    window.removeEventListener('keydown', this.handleKeyDown.bind(this));
    
    this.gameOver = true;
    console.log('Game stopped!');
  }
}

export default GameEngine;