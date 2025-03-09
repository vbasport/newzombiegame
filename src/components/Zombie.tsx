// This file handles zombie enemies, including appearance and properties
import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

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
class Zombie {
  public x: number;
  public y: number;
  public speed: number = 2.5; // Increased speed to make zombies more of a threat
  public health: number = 50;
  public isAlive: boolean = true;
  private mesh: THREE.Mesh;
  private detectionRange: number = 50; // How far zombies can detect the player
  private animationTime: number = 0;
  
  constructor(startPos: THREE.Vector3 | number = Math.random() * 800, y?: number) {
    // Handle both constructor types (Vector3 or x,y coordinates)
    if (startPos instanceof THREE.Vector3) {
      this.x = startPos.x;
      this.y = startPos.z;
      
      // Create a more zombie-like mesh
      const bodyGeometry = new THREE.BoxGeometry(1.2, 1.8, 0.6); // Taller, thinner body
      const bodyMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x2a6e24, // Zombie green
        roughness: 1.0
      });
      this.mesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
      
      // Add zombie head
      const headGeometry = new THREE.SphereGeometry(0.5, 8, 8);
      const headMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x2a6e24,
        roughness: 1.0
      });
      const head = new THREE.Mesh(headGeometry, headMaterial);
      head.position.y = 1.2; // Place on top of body
      this.mesh.add(head);
      
      // Add zombie arms
      const armGeometry = new THREE.BoxGeometry(0.4, 1.2, 0.4);
      const armMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x2a6e24,
        roughness: 1.0
      });
      
      // Left arm
      const leftArm = new THREE.Mesh(armGeometry, armMaterial);
      leftArm.position.set(-0.8, 0, 0);
      this.mesh.add(leftArm);
      
      // Right arm
      const rightArm = new THREE.Mesh(armGeometry, armMaterial);
      rightArm.position.set(0.8, 0, 0);
      this.mesh.add(rightArm);
      
      // Add zombie eyes
      const eyeGeometry = new THREE.SphereGeometry(0.1, 8, 8);
      const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 }); // Red eyes
      
      // Left eye
      const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
      leftEye.position.set(-0.2, 1.2, 0.4);
      head.add(leftEye);
      
      // Right eye
      const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
      rightEye.position.set(0.2, 1.2, 0.4);
      head.add(rightEye);
      
      this.mesh.position.copy(startPos);
    } else {
      this.x = startPos;
      this.y = y || Math.random() * 600;
      
      // Create the same zombie mesh for 2D coordinates
      const bodyGeometry = new THREE.BoxGeometry(1.2, 1.8, 0.6);
      const bodyMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x2a6e24,
        roughness: 1.0
      });
      this.mesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
      
      // Add the same elements as above
      const headGeometry = new THREE.SphereGeometry(0.5, 8, 8);
      const headMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x2a6e24, 
        roughness: 1.0
      });
      const head = new THREE.Mesh(headGeometry, headMaterial);
      head.position.y = 1.2;
      this.mesh.add(head);
      
      const armGeometry = new THREE.BoxGeometry(0.4, 1.2, 0.4);
      const armMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x2a6e24,
        roughness: 1.0
      });
      
      const leftArm = new THREE.Mesh(armGeometry, armMaterial);
      leftArm.position.set(-0.8, 0, 0);
      this.mesh.add(leftArm);
      
      const rightArm = new THREE.Mesh(armGeometry, armMaterial);
      rightArm.position.set(0.8, 0, 0);
      this.mesh.add(rightArm);
      
      const eyeGeometry = new THREE.SphereGeometry(0.1, 8, 8);
      const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
      
      const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
      leftEye.position.set(-0.2, 1.2, 0.4);
      head.add(leftEye);
      
      const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
      rightEye.position.set(0.2, 1.2, 0.4);
      head.add(rightEye);
      
      this.mesh.position.set(this.x, 0.9, this.y); // Higher up to account for taller body
    }
  }
  
  public getMesh(): THREE.Mesh {
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
        
        // Update mesh position
        this.mesh.position.set(this.x, 0.9, this.y);
        
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
    
    if (this.mesh.children.length >= 3) {
      // Left arm (child 1)
      const leftArm = this.mesh.children[1];
      leftArm.rotation.x = armSwing;
      
      // Right arm (child 2)
      const rightArm = this.mesh.children[2];
      rightArm.rotation.x = -armSwing;
    }
    
    // Add a slight bobbing motion
    this.mesh.position.y = 0.9 + Math.sin(this.animationTime * 5) * 0.1;
  }
  
  private wander(deltaTime: number): void {
    // Random wandering behavior
    const wanderAmount = 0.5;
    const randomX = (Math.random() - 0.5) * wanderAmount;
    const randomZ = (Math.random() - 0.5) * wanderAmount;
    
    this.x += randomX * deltaTime;
    this.y += randomZ * deltaTime;
    
    this.mesh.position.set(this.x, 0.9, this.y);
    
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
  }
}

export { ZombieComponent };
export default Zombie;