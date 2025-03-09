// This file handles the player entity, including appearance and properties
import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSocket } from '../systems/NetworkSystem';
import InputSystem from '../systems/InputSystem';
import { HealthBarEntity } from '../systems/UISystem';

// React component for Three.js rendering
const PlayerComponent = () => {
  const meshRef = useRef<THREE.Mesh>(null!);
  const keys = useRef<{ [key: string]: boolean }>({ w: false, a: false, s: false, d: false });
  const socket = useSocket();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key in keys.current) keys.current[e.key] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key in keys.current) keys.current[e.key] = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useFrame((_, delta) => {
    const speed = 5;
    const position = meshRef.current.position;
    if (keys.current.w) position.z -= speed * delta;
    if (keys.current.s) position.z += speed * delta;
    if (keys.current.a) position.x -= speed * delta;
    if (keys.current.d) position.x += speed * delta;

    if (socket) {
      socket.emit('playerInput', { position: position.toArray() });
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0.5, 0]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={0x00ff00} />
    </mesh>
  );
};

// Player class for game logic
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
  private initialState: {
    position: THREE.Vector3,
    rotation: THREE.Euler
  };
  private mobileFacingDirection: THREE.Vector3 = new THREE.Vector3(0, 0, -1);
  
  constructor() {
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
    this.mesh.add(body);
    
    // Create player head
    const headGeometry = new THREE.SphereGeometry(0.4, 16, 16);
    const headMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xffcc99, // Skin tone
      roughness: 0.6
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.85; // Position on top of body
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
    this.mesh.add(leftArm);
    
    // Right arm
    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(0.65, 0.75, 0);
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

    // Create a flashlight/weapon
    const weaponGeometry = new THREE.CylinderGeometry(0.1, 0.15, 0.6, 8);
    const weaponMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x222222,
      metalness: 0.7,
      roughness: 0.3
    });
    const weapon = new THREE.Mesh(weaponGeometry, weaponMaterial);
    weapon.rotation.x = Math.PI / 2; // Orient horizontally
    weapon.position.set(0.5, 0.75, 0.6); // Position in front of right hand
    this.mesh.add(weapon);
    
    // Add a flashlight light
    const flashlight = new THREE.SpotLight(0xffffff, 5, 50, Math.PI / 8, 0.5, 1);
    flashlight.position.set(0.5, 0.75, 0.6);
    flashlight.target.position.set(0.5, 0.75, 5); // Point forward
    this.mesh.add(flashlight);
    this.mesh.add(flashlight.target);
    
    // Set initial position
    this.mesh.position.set(this.x, 0, this.y);
    
    // Store initial state for respawning
    this.initialState = {
      position: this.mesh.position.clone(),
      rotation: this.mesh.rotation.clone()
    };
  }
  
  public getMesh(): THREE.Group {
    return this.mesh;
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
    const joystickInput = inputSystem.getJoystickInput();
    
    // Only update movement if there's meaningful joystick input
    if (Math.abs(joystickInput.x) > 0.1 || Math.abs(joystickInput.y) > 0.1) {
      // Get input values (already normalized)
      const dx = joystickInput.x;
      const dz = joystickInput.y;
      
      // Update position
      this.x += dx * this.speed * deltaTime;
      this.y += dz * this.speed * deltaTime;
      
      // Store direction for shooting (normalized)
      this.mobileFacingDirection.set(dx, 0, dz).normalize();
      
      // Update direction vector for rendering
      this.direction.copy(this.mobileFacingDirection);
      
      // Rotate player to face movement direction
      const angle = Math.atan2(dx, dz);
      this.mesh.rotation.y = angle;
      
      // Animate walking
      this.animateWalking(deltaTime);
    } else {
      // Reset animation when still
      this.resetAnimation();
    }
    
    // Update mesh position
    this.mesh.position.set(this.x, 0, this.y);
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
      
      // Update position
      this.x += dx * this.speed * deltaTime;
      this.y += dz * this.speed * deltaTime;
      
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
    
    // Update mesh position
    this.mesh.position.set(this.x, 0, this.y);
  }
  
  private animateWalking(deltaTime: number): void {
    const legSwing = Math.sin(this.animationTime * 8) * 0.5;
    const armSwing = Math.sin(this.animationTime * 8) * 0.3;
    
    // Animate legs
    if (this.mesh.children.length >= 6) {
      // Left leg (child 4)
      const leftLeg = this.mesh.children[4];
      leftLeg.rotation.x = legSwing;
      
      // Right leg (child 5)
      const rightLeg = this.mesh.children[5];
      rightLeg.rotation.x = -legSwing;
      
      // Left arm (child 2)
      const leftArm = this.mesh.children[2];
      leftArm.rotation.x = -armSwing;
      
      // Right arm (child 3)
      const rightArm = this.mesh.children[3];
      rightArm.rotation.x = armSwing;
    }
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
  }
  
  public getForwardDirection(): THREE.Vector3 {
    return this.direction.clone();
  }
}

export { PlayerComponent };
export default Player;