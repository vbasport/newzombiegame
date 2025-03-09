// This file handles visual rendering of game elements
import Player from '../components/Player';
import Zombie from '../components/Zombie';
import * as THREE from 'three';

interface Entity {
  x: number;
  y: number;
  isAlive: boolean;
}

class RenderingSystem {
  private canvas: HTMLCanvasElement | null = null;
  private context: CanvasRenderingContext2D | null = null;
  private width: number = 800;
  private height: number = 600;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;

  constructor() {
    // Initialize THREE.js components
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb); // Sky blue background
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    document.body.appendChild(this.renderer.domElement);
    
    // Set up lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.left = -100;
    directionalLight.shadow.camera.right = 100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;
    this.scene.add(directionalLight);
    
    // Add a large ground plane for the world
    const groundSize = 200;
    const planeGeometry = new THREE.PlaneGeometry(groundSize, groundSize);
    const planeMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x4d8c57, // Green grass color
      roughness: 0.8,
      metalness: 0.2
    });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI / 2;
    plane.receiveShadow = true;
    this.scene.add(plane);
    
    // Add a grid to help with spatial awareness
    const gridHelper = new THREE.GridHelper(groundSize, 20, 0x000000, 0x000000);
    gridHelper.position.y = 0.01; // Slightly above ground to prevent z-fighting
    this.scene.add(gridHelper);
    
    // Add some trees and obstacles to make the world more interesting
    this.addTrees();
    this.addRocks();
    
    // Initialize camera position
    this.camera.position.set(0, 20, 20);
    this.camera.lookAt(new THREE.Vector3(0, 0, 0));
    
    // Handle window resize
    window.addEventListener('resize', this.handleResize.bind(this));
  }

  private addTrees() {
    // Create simple tree models
    for (let i = 0; i < 30; i++) {
      // Random position within the world bounds
      const x = Math.random() * 180 - 90;
      const z = Math.random() * 180 - 90;
      
      // Tree trunk (cylinder)
      const trunkGeometry = new THREE.CylinderGeometry(0.5, 0.7, 4, 8);
      const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
      const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
      trunk.position.set(x, 2, z);
      trunk.castShadow = true;
      trunk.receiveShadow = true;
      
      // Tree top (cone)
      const topGeometry = new THREE.ConeGeometry(2, 6, 8);
      const topMaterial = new THREE.MeshStandardMaterial({ color: 0x2e8b57 });
      const top = new THREE.Mesh(topGeometry, topMaterial);
      top.position.set(x, 7, z);
      top.castShadow = true;
      top.receiveShadow = true;
      
      this.scene.add(trunk);
      this.scene.add(top);
    }
  }

  private addRocks() {
    // Create simple rock models
    for (let i = 0; i < 15; i++) {
      // Random position within the world bounds
      const x = Math.random() * 180 - 90;
      const z = Math.random() * 180 - 90;
      const scale = Math.random() * 1.5 + 0.5;
      
      // Rock (irregular shape using dodecahedron)
      const rockGeometry = new THREE.DodecahedronGeometry(scale, 0);
      const rockMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x808080,
        roughness: 0.9
      });
      const rock = new THREE.Mesh(rockGeometry, rockMaterial);
      rock.position.set(x, scale / 2, z);
      rock.castShadow = true;
      rock.receiveShadow = true;
      
      this.scene.add(rock);
    }
  }

  public render(): void {
    // Render the scene
    this.renderer.render(this.scene, this.camera);
  }

  public addToScene(mesh: THREE.Object3D): void {
    // Add object to scene and enable shadows
    if (mesh instanceof THREE.Mesh) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
    this.scene.add(mesh);
  }

  public removeFromScene(mesh: THREE.Object3D): void {
    this.scene.remove(mesh);
  }

  public setCameraPosition(x: number, y: number, z: number): void {
    // Position camera above and slightly behind player for better third-person view
    const cameraHeight = 15;
    const cameraDistance = 20;
    
    // Calculate position behind player
    const playerForward = new THREE.Vector3(0, 0, -1); // Assuming player faces -z
    const cameraOffset = playerForward.multiplyScalar(-cameraDistance);
    
    this.camera.position.set(x + cameraOffset.x, cameraHeight, z + cameraOffset.z);
    this.camera.lookAt(new THREE.Vector3(x, 0, z));
  }

  private handleResize(): void {
    // Update camera aspect ratio and renderer size on window resize
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  public cleanup(): void {
    // Remove event listeners and clean up resources
    window.removeEventListener('resize', this.handleResize.bind(this));
    if (this.renderer.domElement && this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}

export default RenderingSystem; 