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
    width: 1.0,
    height: 0.1,
    yOffset: 2.5, // Height above entity
    backgroundOpacity: 0.4,
    foregroundOpacity: 0.8,
    backgroundColor: 0x444444,
    playerHealthColor: 0x22cc22, // Green
    zombieHealthColor: 0xcc2222, // Red
    borderSize: 0.01
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
      depthTest: false // Always show health bar on top
    });
    const background = new THREE.Mesh(backgroundGeometry, backgroundMaterial);
    
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
    
    // Add meshes to container
    container.add(background);
    container.add(foreground);
    
    // Position the health bar above the entity
    const entityMesh = entity.getMesh();
    
    // Add health bar to scene
    this.scene.add(container);
    
    // Store reference to health bar
    this.healthBars.set(entity, {
      container,
      background,
      foreground
    });
    
    // Update the health bar to reflect current health
    this.updateHealthBar(entity);
  }

  /**
   * Updates the health bar to reflect entity's current health
   */
  public updateHealthBar(entity: HealthBarEntity): void {
    const healthBar = this.healthBars.get(entity);
    if (!healthBar) return;
    
    // Calculate health percentage
    const healthPercent = entity.health / entity.maxHealth;
    
    // Update foreground width based on health percentage
    const targetWidth = (UI_CONFIG.healthBar.width - UI_CONFIG.healthBar.borderSize * 2) * healthPercent;
    healthBar.foreground.scale.x = healthPercent;
    
    // Position foreground at left side (so it shrinks from right to left)
    healthBar.foreground.position.x = (UI_CONFIG.healthBar.width * (healthPercent - 1)) / 2;
    
    // Hide health bar if entity is dead
    healthBar.container.visible = entity.isAlive;
  }

  /**
   * Updates the position of the health bar to follow its entity
   */
  public updateHealthBarPosition(entity: HealthBarEntity, camera: THREE.Camera): void {
    const healthBar = this.healthBars.get(entity);
    if (!healthBar || !entity.isAlive) return;
    
    const entityMesh = entity.getMesh();
    const worldPosition = new THREE.Vector3();
    entityMesh.getWorldPosition(worldPosition);
    
    // Position health bar above entity
    healthBar.container.position.set(
      worldPosition.x,
      worldPosition.y + UI_CONFIG.healthBar.yOffset,
      worldPosition.z
    );
    
    // Make health bar face the camera
    healthBar.container.quaternion.copy(camera.quaternion);
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
    // Update positions of all health bars
    this.healthBars.forEach((healthBar, entity) => {
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