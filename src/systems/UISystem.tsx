// This file handles UI elements such as health bars and game status displays
import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';

// Interface for entities that can have health bars
export interface HealthBarEntity {
  health: number;
  maxHealth: number;
  isAlive: boolean;
  getMesh(): THREE.Object3D;
  getName?(): string; // Optional method to get entity name
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
  },
  nameTag: {
    yOffset: 4.5,            // Position further above health bar (increased)
    width: 4.0,              // Width of the name tag (increased to accommodate larger font)
    height: 1.2,             // Height of the name tag (increased to accommodate larger font)
    fontSize: 64,            // Font size for the name tag (doubled from 32)
    backgroundColor: 'rgba(0, 0, 0, 0.8)', // Background color (more opaque)
    textColor: 'white',      // Text color
    borderColor: 'rgba(255, 255, 255, 0.5)', // Border color (more visible)
    borderWidth: 3           // Border width (increased from 2)
  }
};

class UISystem {
  private scene: THREE.Scene;
  private healthBars: Map<HealthBarEntity, {
    container: THREE.Group,
    background: THREE.Mesh,
    foreground: THREE.Mesh,
    nameTag?: THREE.Sprite
  }> = new Map();
  private activePlayers: number = 1; // Start with the local player
  
  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /**
   * Sets the number of active players and updates the display
   */
  public setActivePlayers(count: number): void {
    this.activePlayers = count;
    this.updateActivePlayersDisplay();
  }

  /**
   * Updates the active players display
   */
  private updateActivePlayersDisplay(): void {
    // Find the player count element in the UI
    const playersValue = document.getElementById('players-value');
    if (playersValue) {
      playersValue.textContent = this.activePlayers.toString();
    }
  }

  /**
   * Creates a name tag sprite for an entity
   */
  private createNameTag(name: string): THREE.Sprite {
    // Create a canvas for the name tag
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Could not get canvas context');
      return new THREE.Sprite();
    }
    
    // Set canvas size (increased for better quality)
    canvas.width = 768;
    canvas.height = 192;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background with rounded corners
    ctx.fillStyle = UI_CONFIG.nameTag.backgroundColor;
    this.roundRect(ctx, 0, 0, canvas.width, canvas.height, 20, true, false);
    
    // Draw border
    ctx.strokeStyle = UI_CONFIG.nameTag.borderColor;
    ctx.lineWidth = UI_CONFIG.nameTag.borderWidth;
    this.roundRect(ctx, 0, 0, canvas.width, canvas.height, 20, false, true);
    
    // Draw text with shadow for better visibility
    ctx.shadowColor = 'black';
    ctx.shadowBlur = 5;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    
    ctx.font = `bold ${UI_CONFIG.nameTag.fontSize}px Arial`;
    ctx.fillStyle = UI_CONFIG.nameTag.textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, canvas.width / 2, canvas.height / 2);
    
    // Create texture and sprite
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      sizeAttenuation: true
    });
    
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(UI_CONFIG.nameTag.width, UI_CONFIG.nameTag.height, 1);
    
    return sprite;
  }
  
  /**
   * Helper function to draw rounded rectangles on canvas
   */
  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    fill: boolean,
    stroke: boolean
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    
    if (fill) {
      ctx.fill();
    }
    
    if (stroke) {
      ctx.stroke();
    }
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
    
    // Add name tag if entity has a name
    if (entity.getName && entity.getName()) {
      const nameTag = this.createNameTag(entity.getName());
      nameTag.position.y = UI_CONFIG.nameTag.yOffset - UI_CONFIG.healthBar.yOffset;
      container.add(nameTag);
      
      // Update the health bar entry
      const healthBar = this.healthBars.get(entity);
      if (healthBar) {
        healthBar.nameTag = nameTag;
      }
      
      console.log(`Added name tag for ${entity.getName()}`);
    }
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
      
      // Also update the health bar visual state
      this.updateHealthBar(entity);
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