// This file handles zombie enemies, including appearance and properties
import * as THREE from 'three';
import { HealthBarEntity } from '../systems/UISystem';

class Zombie implements HealthBarEntity {
  public x: number;
  public y: number;
  public speed: number = 2.5; // Increased speed to make zombies more of a threat
  public health: number = 50;
  public maxHealth: number = 50; // Added for health bar interface
  public isAlive: boolean = true;
  public deathTime: number | null = null; // Track when the zombie died for cleanup
  private mesh: THREE.Group;
  private detectionRange: number = 50; // How far zombies can detect the player
  private animationTime: number = 0;
  private isRagdolled: boolean = false; // Track if zombie is currently in ragdoll state
  private ragdollEndTime: number = 0; // When the ragdoll effect should end
  private ragdollDuration: number = 1.5; // How long the ragdoll effect lasts in seconds
  private originalRotation: THREE.Euler = new THREE.Euler(); // Store original rotation
  private knockbackVelocity: THREE.Vector3 = new THREE.Vector3(); // Velocity for smooth knockback
  private knockbackDuration: number = 0.5; // Duration of knockback animation in seconds
  private knockbackStartTime: number = 0; // When the knockback started
  private knockbackTargetPosition: THREE.Vector3 = new THREE.Vector3(); // Target position after knockback

  constructor(startPos: THREE.Vector3 | number = Math.random() * 800, y?: number) {
    if (startPos instanceof THREE.Vector3) {
      this.x = startPos.x;
      this.y = startPos.z;
    } else {
      this.x = startPos;
      this.y = y || Math.random() * 800;
    }
    
    // Create a group to hold all zombie components
    this.mesh = new THREE.Group();
    
    // Position the group at the correct height (y=0 in Three.js is ground level)
    this.mesh.position.set(this.x, 0, this.y);
    
    // Create zombie body
    const bodyGeometry = new THREE.BoxGeometry(1.2, 1.8, 0.6); // Taller, thinner body
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x2a6e24, // Zombie green
      roughness: 1.0
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.9; // Position body height
    body.castShadow = true;
    body.receiveShadow = true;
    this.mesh.add(body);
    
    // Add zombie head
    const headGeometry = new THREE.SphereGeometry(0.5, 8, 8);
    const headMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x2a6e24,
      roughness: 1.0
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 2.1; // Place on top of body
    head.castShadow = true;
    head.receiveShadow = true;
    this.mesh.add(head);
    
    // Add zombie arms
    const armGeometry = new THREE.BoxGeometry(0.3, 1.2, 0.3); // Longer arms
    const armMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x2a6e24
    });
    
    // Left arm (positioned forward)
    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-0.75, 0.9, 0.2);
    leftArm.rotation.x = Math.PI / 4; // Arms reaching forward
    leftArm.castShadow = true;
    leftArm.receiveShadow = true;
    this.mesh.add(leftArm);
    
    // Right arm (positioned forward)
    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(0.75, 0.9, 0.2);
    rightArm.rotation.x = Math.PI / 4; // Arms reaching forward
    rightArm.castShadow = true;
    rightArm.receiveShadow = true;
    this.mesh.add(rightArm);
    
    // Add zombie eyes
    const eyeGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 }); // Red eyes
    
    // Left eye
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.2, 0.1, 0.4);
    head.add(leftEye);
    
    // Right eye
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.2, 0.1, 0.4);
    head.add(rightEye);
  }
  
  public getMesh(): THREE.Group {
    return this.mesh;
  }
  
  public update(deltaTime: number, playerPos: THREE.Vector3): void {
    // Update animation time
    this.animationTime += deltaTime;
    
    // Handle knockback animation if active
    const currentTime = performance.now() / 1000;
    if (this.isRagdolled) {
      // Check if we're still in the knockback phase
      const knockbackElapsed = currentTime - this.knockbackStartTime;
      if (knockbackElapsed < this.knockbackDuration) {
        // Calculate progress (0 to 1)
        const progress = knockbackElapsed / this.knockbackDuration;
        
        // Apply easing for more natural movement (ease-out)
        const easedProgress = 1 - Math.pow(1 - progress, 3);
        
        // Interpolate between start and target position
        const startX = this.x - this.knockbackVelocity.x * this.knockbackDuration;
        const startY = this.y - this.knockbackVelocity.z * this.knockbackDuration;
        
        this.x = startX + this.knockbackVelocity.x * this.knockbackDuration * easedProgress;
        this.y = startY + this.knockbackVelocity.z * this.knockbackDuration * easedProgress;
        
        // Update mesh position
        this.mesh.position.set(this.x, this.mesh.position.y, this.y);
        
        // Apply some random rotation while in ragdoll state to simulate tumbling
        this.mesh.rotation.x += (Math.random() - 0.5) * 0.1;
        this.mesh.rotation.z += (Math.random() - 0.5) * 0.1;
      }
      
      // Check if ragdoll effect should end
      if (currentTime >= this.ragdollEndTime) {
        this.recoverFromRagdoll();
      }
      
      return; // Skip normal movement while ragdolled
    }
    
    // Calculate direction to player
    const dx = playerPos.x - this.x;
    const dz = playerPos.z - this.y;
    const distance = Math.sqrt(dx * dx + dz * dz);
    
    // Only chase if player is in detection range
    if (distance <= this.detectionRange) {
      // Minimum distance to maintain from player (buffer zone)
      const minDistanceBuffer = 0.5;
      
      // Only move closer if we're outside the buffer zone
      if (distance > minDistanceBuffer) {
        // Normalize direction
        const normalizedDx = dx / distance;
        const normalizedDz = dz / distance;
        
        // Calculate new position with chase speed
        const chaseSpeed = this.speed * (1 + (1 - Math.min(distance, this.detectionRange) / this.detectionRange) * 0.5);
        
        // Calculate potential new position
        const newX = this.x + normalizedDx * chaseSpeed * deltaTime;
        const newY = this.y + normalizedDz * chaseSpeed * deltaTime;
        
        // Calculate new distance after movement
        const newDx = playerPos.x - newX;
        const newDz = playerPos.z - newY;
        const newDistance = Math.sqrt(newDx * newDx + newDz * newDz);
        
        // Only update position if we wouldn't get closer than the buffer
        if (newDistance >= minDistanceBuffer) {
          this.x = newX;
          this.y = newY;
        } else {
          // If movement would bring us too close, stop at the buffer distance
          // Calculate position at exactly buffer distance
          const bufferRatio = (distance - minDistanceBuffer) / distance;
          this.x += normalizedDx * chaseSpeed * deltaTime * bufferRatio;
          this.y += normalizedDz * chaseSpeed * deltaTime * bufferRatio;
        }
        
        // Update mesh position - Important: y is vertical in Three.js, but z is our depth coordinate in game logic
        this.mesh.position.set(this.x, 0, this.y);
        
        // Rotate zombie to face the player
        this.mesh.lookAt(playerPos);
        
        // Apply shambling animation
        this.animateZombie(deltaTime);
      }
    } else {
      // Wander randomly when player is not in detection range
      this.wander(deltaTime);
    }
  }
  
  private animateZombie(_deltaTime: number): void {
    // Animation logic for zombie movement will be implemented here
    // The parameter is prefixed with _ to indicate it's intentionally unused for now
  }
  
  private wander(deltaTime: number): void {
    // Random wandering behavior
    const wanderAmount = 0.5;
    const randomX = (Math.random() - 0.5) * wanderAmount;
    const randomZ = (Math.random() - 0.5) * wanderAmount;
    
    this.x += randomX * deltaTime;
    this.y += randomZ * deltaTime;
    
    // Update mesh position - Important: y is vertical in Three.js, but z is our depth coordinate in game logic
    this.mesh.position.set(this.x, 0, this.y);
    
    // Apply wandering animation
    this.animateZombie(deltaTime);
  }
  
  public takeDamage(amount: number): void {
    if (!this.isAlive) {
      console.log('Tried to damage already dead zombie');
      return; // Don't damage if already dead
    }
    
    // Ensure amount is a number and positive
    const damageAmount = Math.abs(Number(amount)) || 0;
    if (damageAmount === 0) {
      console.warn('Invalid damage amount:', amount);
      return;
    }
    
    // Apply damage
    this.health = Math.max(0, this.health - damageAmount);
    console.log(`Zombie took ${damageAmount} damage. Health now: ${this.health}/${this.maxHealth}`);
    
    // Check if zombie died
    if (this.health <= 0) {
      this.health = 0;
      this.isAlive = false;
      this.deathTime = performance.now() / 1000; // Record death time in seconds
      
      // Make the zombie fall down when dead
      this.mesh.rotation.x = Math.PI / 2;
      this.mesh.position.y = 0.3;
      
      console.log('Zombie died!');
    }
  }
  
  public updatePosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
    // Update mesh position to match logical position
    this.mesh.position.set(this.x, 0, this.y);
  }

  /**
   * Apply a ragdoll effect to the zombie with knockback
   * @param knockbackDirection Direction to knock the zombie back
   * @param knockbackForce How far to knock the zombie back
   */
  public applyRagdollEffect(knockbackDirection?: THREE.Vector3, knockbackForce?: number): void {
    // Store current time
    const currentTime = performance.now() / 1000;
    
    // Set ragdoll end time
    this.ragdollEndTime = currentTime + this.ragdollDuration;
    
    // Store original rotation if not already ragdolled
    if (!this.isRagdolled) {
      this.originalRotation.copy(this.mesh.rotation);
    }
    
    // Set ragdoll flag
    this.isRagdolled = true;
    
    // Apply initial random rotation to simulate being knocked back
    this.mesh.rotation.x = (Math.random() - 0.5) * Math.PI * 0.5;
    this.mesh.rotation.z = (Math.random() - 0.5) * Math.PI * 0.5;
    
    // Raise the zombie slightly off the ground during ragdoll
    this.mesh.position.y = 0.5;
    
    // Set up knockback animation
    this.knockbackStartTime = currentTime;
    
    // If knockback direction is provided, use it
    if (knockbackDirection && knockbackForce) {
      // Calculate knockback velocity
      this.knockbackVelocity.set(
        knockbackDirection.x * knockbackForce,
        0,
        knockbackDirection.z * knockbackForce
      );
      
      // Calculate target position
      this.knockbackTargetPosition.set(
        this.x + this.knockbackVelocity.x * this.knockbackDuration,
        0,
        this.y + this.knockbackVelocity.z * this.knockbackDuration
      );
    }
    
    console.log('Zombie ragdolled');
  }
  
  /**
   * Recover from ragdoll effect
   */
  private recoverFromRagdoll(): void {
    // Reset ragdoll flag
    this.isRagdolled = false;
    
    // Reset position height
    this.mesh.position.y = 0;
    
    // Reset rotation (smoothly in the next few frames)
    this.mesh.rotation.x = 0;
    this.mesh.rotation.z = 0;
    
    // Play recovery sound
    this.playRecoverySound();
    
    console.log('Zombie recovered from ragdoll');
  }
  
  /**
   * Play a sound when zombie recovers from ragdoll state
   */
  private playRecoverySound(): void {
    // Create audio context
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Create oscillator for growl sound
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    // Set up a low growl sound
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(100, audioContext.currentTime);
    oscillator.frequency.linearRampToValueAtTime(80, audioContext.currentTime + 0.5);
    
    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Set volume and fade out
    gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);
    
    // Play sound
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.5);
  }
}

export default Zombie;