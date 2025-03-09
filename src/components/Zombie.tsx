// This file handles zombie enemies, including appearance and properties
import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { HealthBarEntity } from '../systems/UISystem';

// React component for Three.js rendering
const ZombieComponent = () => {
  const meshRef = useRef<THREE.Mesh>(null!);
  const playerPos = useRef(new THREE.Vector3(0, 0, 0));

  useEffect(() => {
    // Assume player position updates come from the server in a real scenario
    // For now, we'll simulate tracking the player locally
  }, []);

  useFrame((state, delta) => {
    const direction = playerPos.current.clone().sub(meshRef.current.position).normalize();
    const speed = 2;
    meshRef.current.position.add(direction.multiplyScalar(speed * delta));
  });

  return (
    <mesh ref={meshRef} position={[5, 0.5, 5]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={0xff0000} />
    </mesh>
  );
};

// Zombie class for game logic
class Zombie implements HealthBarEntity {
  public x: number;
  public y: number;
  public speed: number = 2.5; // Increased speed to make zombies more of a threat
  public health: number = 50;
  public maxHealth: number = 50; // Added for health bar interface
  public isAlive: boolean = true;
  private mesh: THREE.Group;
  private detectionRange: number = 50; // How far zombies can detect the player
  private animationTime: number = 0;
  
  constructor(startPos: THREE.Vector3 | number = Math.random() * 800, y?: number) {
    // Create a group to hold all zombie components
    this.mesh = new THREE.Group();
    
    // Handle both constructor types (Vector3 or x,y coordinates)
    if (startPos instanceof THREE.Vector3) {
      this.x = startPos.x;
      this.y = startPos.z;
      
      // Position the group at the correct height (y=0 in Three.js is ground level)
      this.mesh.position.set(startPos.x, 0, startPos.z);
    } else {
      this.x = startPos;
      this.y = y || Math.random() * 600;
      
      // Position the group at the correct height
      this.mesh.position.set(this.x, 0, this.y);
    }
    
    // Create zombie body
    const bodyGeometry = new THREE.BoxGeometry(1.2, 1.8, 0.6); // Taller, thinner body
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x2a6e24, // Zombie green
      roughness: 1.0
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.9; // Position body height
    this.mesh.add(body);
    
    // Add zombie head
    const headGeometry = new THREE.SphereGeometry(0.5, 8, 8);
    const headMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x2a6e24,
      roughness: 1.0
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 2.1; // Place on top of body
    this.mesh.add(head);
    
    // Add zombie arms
    const armGeometry = new THREE.BoxGeometry(0.4, 1.2, 0.4);
    const armMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x2a6e24,
      roughness: 1.0
    });
    
    // Left arm
    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-0.8, 0.9, 0);
    this.mesh.add(leftArm);
    
    // Right arm
    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(0.8, 0.9, 0);
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
    
    // Calculate direction to player
    const dx = playerPos.x - this.x;
    const dz = playerPos.z - this.y;
    const distance = Math.sqrt(dx * dx + dz * dz);
    
    // Only chase if player is in detection range
    if (distance <= this.detectionRange) {
      if (distance > 0.1) { // Avoid division by zero and jittering
        // Normalize direction
        const normalizedDx = dx / distance;
        const normalizedDz = dz / distance;
        
        // Update position with slightly increased speed when closer to player
        const chaseSpeed = this.speed * (1 + (1 - Math.min(distance, this.detectionRange) / this.detectionRange) * 0.5);
        this.x += normalizedDx * chaseSpeed * deltaTime;
        this.y += normalizedDz * chaseSpeed * deltaTime;
        
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
  
  private animateZombie(deltaTime: number): void {
    // Make zombie arms swing as it walks
    const armSwing = Math.sin(this.animationTime * 4) * 0.3;
    
    if (this.mesh.children.length >= 4) {
      // Left arm (child 2)
      const leftArm = this.mesh.children[2];
      leftArm.rotation.x = armSwing;
      
      // Right arm (child 3)
      const rightArm = this.mesh.children[3];
      rightArm.rotation.x = -armSwing;
    }
    
    // Add a slight bobbing motion
    const firstChild = this.mesh.children[0]; // Body
    if (firstChild) {
      firstChild.position.y = 0.9 + Math.sin(this.animationTime * 5) * 0.1;
    }
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
    this.health -= amount;
    if (this.health <= 0) {
      this.health = 0;
      this.isAlive = false;
      
      // Make the zombie fall down when dead
      this.mesh.rotation.x = Math.PI / 2;
      this.mesh.position.y = 0.3;
    }
  }
  
  public updatePosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
    // Update mesh position to match logical position
    this.mesh.position.set(this.x, 0, this.y);
  }
}

export { ZombieComponent };
export default Zombie;