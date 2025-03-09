// This file handles UI elements such as health bars and game status displays
import * as THREE from 'three';

// Interface for entities that can have health bars
export interface HealthBarEntity {
  health: number;
  maxHealth: number;
  isAlive: boolean;
  getMesh(): THREE.Object3D;
}

// Configuration parameters for health bars to keep values flexible
const UI_CONFIG = {
  healthBar: {
    width: 1.5,              // Increased width for better visibility
    height: 0.2,             // Increased height for better visibility
    yOffset: 3.0,            // Increased height above entity
    backgroundOpacity: 0.6,  // More opaque background
    foregroundOpacity: 0.9,  // More opaque foreground
    backgroundColor: 0x222222,
    playerHealthColor: 0x22cc22, // Green
    zombieHealthColor: 0xcc2222, // Red
    borderSize: 0.02
  }
};

class UISystem {
  private scene: THREE.Scene;
  private healthBars: Map<HealthBarEntity, {
    container: THREE.Group,
    background: THREE.Mesh,
    foreground: THREE.Mesh
  }> = new Map();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /**
   * Creates a health bar for an entity and adds it to the scene
   */
  public createHealthBar(entity: HealthBarEntity, isPlayer: boolean = false): void {
    // Create a group to hold health bar elements
    const container = new THREE.Group();
    
    // Background bar (represents max health)
    const backgroundGeometry = new THREE.PlaneGeometry(
      UI_CONFIG.healthBar.width,
      UI_CONFIG.healthBar.height
    );
    const backgroundMaterial = new THREE.MeshBasicMaterial({
      color: UI_CONFIG.healthBar.backgroundColor,
      transparent: true,
      opacity: UI_CONFIG.healthBar.backgroundOpacity,
      depthTest: false
    });
    const background = new THREE.Mesh(backgroundGeometry, backgroundMaterial);
    container.add(background);
    
    // Foreground bar (represents current health)
    const foregroundGeometry = new THREE.PlaneGeometry(
      UI_CONFIG.healthBar.width - UI_CONFIG.healthBar.borderSize * 2,
      UI_CONFIG.healthBar.height - UI_CONFIG.healthBar.borderSize * 2
    );
    const foregroundMaterial = new THREE.MeshBasicMaterial({
      color: isPlayer ? UI_CONFIG.healthBar.playerHealthColor : UI_CONFIG.healthBar.zombieHealthColor,
      transparent: true,
      opacity: UI_CONFIG.healthBar.foregroundOpacity,
      depthTest: false
    });
    const foreground = new THREE.Mesh(foregroundGeometry, foregroundMaterial);
    foreground.position.z = 0.01; // Slightly in front of background
    container.add(foreground);
    
    // Add to scene and store reference
    this.scene.add(container);
    this.healthBars.set(entity, { container, background, foreground });
    
    // Set initial position
    this.updateHealthBarPosition(entity, this.scene.children[0] as THREE.Camera);
  }

  /**
   * Updates the health bar to reflect current health
   */
  public updateHealthBar(entity: HealthBarEntity): void {
    const healthBar = this.healthBars.get(entity);
    if (!healthBar) {
      console.warn('Tried to update health bar for entity without one');
      return;
    }
    
    // Calculate health percentage
    const healthPercent = Math.max(0, Math.min(1, entity.health / entity.maxHealth));
    
    // Update foreground width based on health percentage
    healthBar.foreground.scale.x = healthPercent;
    
    // Position foreground at left side (so it shrinks from right to left)
    healthBar.foreground.position.x = (UI_CONFIG.healthBar.width * (healthPercent - 1)) / 2;
    
    // Hide health bar if entity is dead
    healthBar.container.visible = entity.isAlive;
    
    // Debug info
    console.log(`Updated health bar: ${entity.health}/${entity.maxHealth} (${(healthPercent * 100).toFixed(0)}%)`);
  }

  /**
   * Updates the position of the health bar to follow its entity
   */
  public updateHealthBarPosition(entity: HealthBarEntity, camera: THREE.Camera): void {
    const healthBar = this.healthBars.get(entity);
    if (!healthBar) return;
    
    // Get entity position
    const position = entity.getMesh().position.clone();
    
    // Add height offset to position health bar above entity
    position.y += UI_CONFIG.healthBar.yOffset;
    
    // Make health bar face the camera
    healthBar.container.quaternion.copy(camera.quaternion);
    
    // Update health bar position to follow entity
    healthBar.container.position.set(
      position.x,
      position.y,
      position.z
    );
  }

  /**
   * Removes a health bar when entity is destroyed
   */
  public removeHealthBar(entity: HealthBarEntity): void {
    const healthBar = this.healthBars.get(entity);
    if (!healthBar) return;
    
    // Remove from scene
    this.scene.remove(healthBar.container);
    
    // Remove from map
    this.healthBars.delete(entity);
  }

  /**
   * Updates all health bars positions
   */
  public update(camera: THREE.Camera): void {
    this.healthBars.forEach((_healthBar, entity) => {
      // Update health bar positions to follow entities
      this.updateHealthBarPosition(entity, camera);
    });
  }

  /**
   * Clean up resources when system is destroyed
   */
  public cleanup(): void {
    // Remove all health bars from scene
    this.healthBars.forEach((healthBar) => {
      this.scene.remove(healthBar.container);
    });
    
    // Clear map
    this.healthBars.clear();
  }
}

export default UISystem; 