// This file handles combat mechanics, damage, and health
import Player from '../components/Player';
import Zombie from '../components/Zombie';

interface Entity {
  x: number;
  y: number;
  health: number;
  isAlive: boolean;
  takeDamage: (amount: number) => void;
}

class CombatSystem {
  private attackRange: number = 1.5;
  private playerDamage: number = 10;
  private zombieDamage: number = 5;
  private attackCooldown: number = 0.5; // seconds
  private currentCooldown: number = 0;

  constructor() {
    // Combat system initialization if needed
  }

  public update(deltaTime: number, player: Entity, zombies: Entity[]): void {
    // Update cooldown timer
    if (this.currentCooldown > 0) {
      this.currentCooldown -= deltaTime;
    }

    // Check for zombie attacks on player
    this.handleZombieAttacks(player, zombies, deltaTime);
    
    // Check for player attacks on zombies (if player pressed attack button)
    this.handlePlayerAttacks(player, zombies);
    
    // Remove dead zombies
    this.removeDeadEntities(zombies);
  }

  private handleZombieAttacks(player: Entity, zombies: Entity[], deltaTime: number): void {
    for (const zombie of zombies) {
      if (!zombie.isAlive) continue;
      
      // Check if zombie is close enough to attack player
      const dx = player.x - zombie.x;
      const dy = player.y - zombie.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < this.attackRange) {
        // Zombie attacks player
        player.takeDamage(this.zombieDamage * deltaTime);
      }
    }
  }

  private handlePlayerAttacks(player: Entity, zombies: Entity[]): void {
    // Only allow attacks if cooldown is finished
    if (this.currentCooldown <= 0) {
      // Check if attack button was pressed (this would be checked elsewhere and passed in)
      const isAttacking = false; // This would be set based on input
      
      if (isAttacking) {
        // Reset cooldown
        this.currentCooldown = this.attackCooldown;
        
        // Attack zombies in range
        for (const zombie of zombies) {
          if (!zombie.isAlive) continue;
          
          // Check if zombie is in attack range
          const dx = zombie.x - player.x;
          const dy = zombie.y - player.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < this.attackRange) {
            // Player attacks zombie
            zombie.takeDamage(this.playerDamage);
          }
        }
      }
    }
  }

  private removeDeadEntities(entities: Entity[]): void {
    // Filter out dead entities (in a real implementation, we might mark them for removal instead)
    // Here we just update their state but keep them in the array
  }
}

export default CombatSystem;
