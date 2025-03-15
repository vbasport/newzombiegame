// This file handles the player entity, including appearance and properties
import * as THREE from 'three';
import InputSystem from '../systems/InputSystem';
import { HealthBarEntity } from '../systems/UISystem';
import { Weapon, WeaponType } from './Weapon';

class Player implements HealthBarEntity {
  public x: number = 0;
  public y: number = 0;
  public speed: number = 8;
  public health: number = 100;
  public maxHealth: number = 100; // Added for health bar interface
  public isAlive: boolean = true;
  private mesh: THREE.Group;
  private direction: THREE.Vector3 = new THREE.Vector3(0, 0, -1); // Forward direction
  private animationTime: number = 0;
  public kills: number = 0; // Track zombie kills for scoring
  public timeSurvived: number = 0; // Track survival time in seconds
  private mobileFacingDirection: THREE.Vector3 = new THREE.Vector3(0, 0, -1);
  private playerName: string = 'Player'; // Default player name
  private weapon: Weapon; // Player's current weapon
  
  constructor(playerName?: string) {
    // Set player name if provided
    if (playerName) {
      this.playerName = decodeURIComponent(playerName);
    }
    
    // Create a group to hold all player components
    this.mesh = new THREE.Group();
    
    // Create player body
    const bodyGeometry = new THREE.BoxGeometry(1, 1.5, 0.6);
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x3366cc, // Blue color for player
      roughness: 0.5
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.75; // Position at half height
    body.castShadow = true;
    body.receiveShadow = true;
    this.mesh.add(body);
    
    // Create player head
    const headGeometry = new THREE.SphereGeometry(0.4, 16, 16);
    const headMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xffcc99, // Skin tone
      roughness: 0.6
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.85; // Position on top of body
    head.castShadow = true;
    head.receiveShadow = true;
    this.mesh.add(head);
    
    // Create player arms
    const armGeometry = new THREE.BoxGeometry(0.3, 1, 0.3);
    const armMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x3366cc, 
      roughness: 0.5
    });
    
    // Left arm
    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-0.65, 0.75, 0);
    leftArm.castShadow = true;
    leftArm.receiveShadow = true;
    this.mesh.add(leftArm);
    
    // Right arm
    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(0.65, 0.75, 0);
    rightArm.castShadow = true;
    rightArm.receiveShadow = true;
    this.mesh.add(rightArm);
    
    // Create player legs
    const legGeometry = new THREE.BoxGeometry(0.3, 1, 0.3);
    const legMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x0a3870, // Darker blue for pants
      roughness: 0.5
    });
    
    // Left leg
    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.25, -0.25, 0);
    this.mesh.add(leftLeg);
    
    // Right leg
    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(0.25, -0.25, 0);
    this.mesh.add(rightLeg);

    // Create and add weapon
    this.weapon = new Weapon(WeaponType.PISTOL);
    const weaponMesh = this.weapon.mesh;
    weaponMesh.position.set(0.5, 0.75, 0.6); // Position in front of right hand
    this.mesh.add(weaponMesh);
    
    // Initial position slightly raised above ground to prevent z-fighting
    this.mesh.position.set(this.x, 0.01, this.y);
  }
  
  public getMesh(): THREE.Group {
    return this.mesh;
  }
  
  /**
   * Get the player's name for display
   */
  public getName(): string {
    return this.playerName;
  }
  
  /**
   * Set the player's name
   */
  public setName(name: string): void {
    this.playerName = name;
  }
  
  public update(deltaTime: number, inputSystem: InputSystem): void {
    // Only update if alive
    if (!this.isAlive) return;
    
    // Update survival time
    this.timeSurvived += deltaTime;
    
    // Update animation time
    this.animationTime += deltaTime;
    
    const input = inputSystem.getInput();
    
    // Handle movement differently for mobile vs keyboard
    if (inputSystem.isMobile()) {
      this.handleMobileMovement(deltaTime, inputSystem);
    } else {
      this.handleKeyboardMovement(deltaTime, input);
    }
  }
  
  private handleMobileMovement(deltaTime: number, inputSystem: InputSystem): void {
    const moveJoystickInput = inputSystem.getMoveJoystickInput();
    const aimJoystickInput = inputSystem.getAimJoystickInput();
    
    // Only update movement if there's meaningful joystick input
    if (Math.abs(moveJoystickInput.x) > 0.1 || Math.abs(moveJoystickInput.y) > 0.1) {
      // Position is now updated by GameEngine with collision detection
      // Animation is still handled here
      this.animateWalking(deltaTime);
    } else {
      // Reset animation when still
      this.resetAnimation();
    }
    
    // Handle aiming direction separately from movement
    if (aimJoystickInput.isActive && (Math.abs(aimJoystickInput.x) > 0.1 || Math.abs(aimJoystickInput.y) > 0.1)) {
      // Use aim joystick for direction
      this.mobileFacingDirection.set(aimJoystickInput.x, 0, aimJoystickInput.y).normalize();
      
      // Update direction vector for rendering
      this.direction.copy(this.mobileFacingDirection);
      
      // Rotate player to face aiming direction
      const angle = Math.atan2(aimJoystickInput.x, aimJoystickInput.y);
      this.mesh.rotation.y = angle;
    } else if (Math.abs(moveJoystickInput.x) > 0.1 || Math.abs(moveJoystickInput.y) > 0.1) {
      // If no aim input but moving, face movement direction
      this.mobileFacingDirection.set(moveJoystickInput.x, 0, moveJoystickInput.y).normalize();
      
      // Update direction vector for rendering
      this.direction.copy(this.mobileFacingDirection);
      
      // Rotate player to face movement direction
      const angle = Math.atan2(moveJoystickInput.x, moveJoystickInput.y);
      this.mesh.rotation.y = angle;
    }
    
    // Update mesh position is now handled by the GameEngine
  }
  
  private handleKeyboardMovement(deltaTime: number, input: { [key: string]: boolean }): void {
    // Get movement direction from input
    let dx = 0;
    let dz = 0;
    
    if (input['w']) dz -= 1;
    if (input['s']) dz += 1;
    if (input['a']) dx -= 1;
    if (input['d']) dx += 1;
    
    // Only update direction if moving
    if (dx !== 0 || dz !== 0) {
      // Normalize movement vector
      const length = Math.sqrt(dx * dx + dz * dz);
      dx /= length;
      dz /= length;
      
      // Position is now updated by GameEngine with collision detection
      
      // Update direction vector
      this.direction.set(dx, 0, dz).normalize();
      
      // Rotate player to face movement direction
      const angle = Math.atan2(dx, dz);
      this.mesh.rotation.y = angle;
      
      // Animate walking
      this.animateWalking(deltaTime);
    } else {
      // Reset animation when still
      this.resetAnimation();
    }
    
    // Update mesh position is now handled by the GameEngine
  }
  
  private animateWalking(_deltaTime: number): void {
    // Animation logic for walking will be implemented here
    // The parameter is prefixed with _ to indicate it's intentionally unused for now
  }
  
  private resetAnimation(): void {
    // Reset all animations to default pose
    if (this.mesh.children.length >= 6) {
      // Reset limb rotations
      this.mesh.children[2].rotation.x = 0; // Left arm
      this.mesh.children[3].rotation.x = 0; // Right arm
      this.mesh.children[4].rotation.x = 0; // Left leg
      this.mesh.children[5].rotation.x = 0; // Right leg
    }
  }
  
  public takeDamage(amount: number): void {
    if (!this.isAlive) return; // Don't damage if already dead
    
    this.health -= amount;
    if (this.health <= 0) {
      this.health = 0;
      this.isAlive = false;
      
      // Fall down when dead
      this.mesh.rotation.x = Math.PI / 2;
      this.mesh.position.y = 0.3;
    }
  }

  public heal(amount: number): void {
    if (!this.isAlive) return; // Don't heal if dead
    
    this.health = Math.min(this.health + amount, this.maxHealth);
  }
  
  public revive(): void {
    // Reset health and alive status
    this.health = this.maxHealth;
    this.isAlive = true;
    
    // Reset position and rotation
    this.mesh.rotation.x = 0;
    this.mesh.position.y = 0;
    
    // Reset animations
    this.resetAnimation();
    
    console.log('Player revived with full health!');
  }
  
  public addKill(): void {
    this.kills++;
  }
  
  public getStats(): { health: number, kills: number, timeSurvived: number } {
    return {
      health: this.health,
      kills: this.kills,
      timeSurvived: this.timeSurvived
    };
  }
  
  public updatePosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
    // Update mesh position to match logical position
    this.mesh.position.set(this.x, 0, this.y);
  }
  
  public getForwardDirection(): THREE.Vector3 {
    return this.direction.clone();
  }
  
  /**
   * Get the player's current weapon
   */
  public getWeapon(): Weapon {
    return this.weapon;
  }
  
  /**
   * Set a new weapon for the player
   * @param weaponType The type of weapon to equip
   */
  public setWeapon(weaponType: WeaponType): void {
    // Remove current weapon mesh
    const oldWeaponMesh = this.weapon.mesh;
    this.mesh.remove(oldWeaponMesh);
    
    // Create new weapon
    this.weapon = new Weapon(weaponType);
    
    // Add new weapon mesh
    const weaponMesh = this.weapon.mesh;
    weaponMesh.position.set(0.5, 0.75, 0.6); // Position in front of right hand
    this.mesh.add(weaponMesh);
  }
  
  /**
   * Get the position of the weapon tip for bullet origin
   */
  public getWeaponTipPosition(): THREE.Vector3 {
    return this.weapon.getWeaponTipPosition(this.mesh.position, this.direction);
  }
}

export default Player;