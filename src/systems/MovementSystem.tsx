// This file handles entity movement and physics
import Player from '../components/Player';
import Zombie from '../components/Zombie';

interface Entity {
  x: number;
  y: number;
  speed: number;
  updatePosition: (x: number, y: number) => void;
}

class MovementSystem {
  private playerSpeed: number = 5;
  private zombieSpeed: number = 2;

  constructor() {
    // Movement system initialization if needed
  }

  public update(deltaTime: number, entities: Entity[], playerInput: { [key: string]: boolean }): void {
    // Update player position based on input
    const player = entities[0]; // Assuming first entity is player
    this.movePlayer(player, playerInput, deltaTime);
    
    // Update zombies to follow player
    for (let i = 1; i < entities.length; i++) {
      this.moveZombieTowardsPlayer(entities[i], player, deltaTime);
    }

    // Handle collisions
    this.handleCollisions(entities);
  }

  private movePlayer(player: Entity, input: { [key: string]: boolean }, deltaTime: number): void {
    let dx = 0;
    let dy = 0;

    if (input['w']) dy -= player.speed * deltaTime;
    if (input['s']) dy += player.speed * deltaTime;
    if (input['a']) dx -= player.speed * deltaTime;
    if (input['d']) dx += player.speed * deltaTime;

    // Normalize diagonal movement to prevent faster diagonal movement
    if (dx !== 0 && dy !== 0) {
      const magnitude = Math.sqrt(dx * dx + dy * dy);
      dx = dx / magnitude * player.speed * deltaTime;
      dy = dy / magnitude * player.speed * deltaTime;
    }

    player.updatePosition(player.x + dx, player.y + dy);
  }

  private moveZombieTowardsPlayer(zombie: Entity, player: Entity, deltaTime: number): void {
    // Calculate direction to player
    const dx = player.x - zombie.x;
    const dy = player.y - zombie.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Normalize the direction
    const normalizedDx = dx / distance;
    const normalizedDy = dy / distance;
    
    // Move zombie towards player
    zombie.updatePosition(
      zombie.x + normalizedDx * zombie.speed * deltaTime,
      zombie.y + normalizedDy * zombie.speed * deltaTime
    );
  }

  private handleCollisions(entities: Entity[]): void {
    // Simple collision detection between entities
    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        const e1 = entities[i];
        const e2 = entities[j];
        
        // Check for collision (simplified as point collision)
        const dx = e1.x - e2.x;
        const dy = e1.y - e2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // If entities are too close, adjust positions
        const minDistance = 1.0; // Minimum separation
        if (distance < minDistance) {
          // Calculate separation vector
          const separationX = (dx / distance) * (minDistance - distance) * 0.5;
          const separationY = (dy / distance) * (minDistance - distance) * 0.5;
          
          // Adjust positions
          e1.updatePosition(e1.x + separationX, e1.y + separationY);
          e2.updatePosition(e2.x - separationX, e2.y - separationY);
        }
      }
    }
  }
}

export default MovementSystem;
