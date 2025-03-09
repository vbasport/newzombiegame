// This file handles visual rendering of game elements
import * as THREE from 'three';

class RenderingSystem {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;

  constructor() {
    // Initialize THREE.js components
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb); // Sky blue background
    
    // Set up camera with better field of view
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 15, 15); // Initial position
    this.camera.lookAt(0, 0, 0);
    
    // Initialize renderer with existing canvas or create a new one
    const existingCanvas = document.querySelector('canvas');
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      canvas: existingCanvas || undefined
    });
    
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Better shadow quality
    
    // Only append to document if we created a new canvas
    if (!existingCanvas) {
      document.body.appendChild(this.renderer.domElement);
    }
    
    // Set up scene and lighting
    this.setupEnvironment();
    
    // Handle window resize
    window.addEventListener('resize', this.handleResize.bind(this));
  }
  
  private setupEnvironment() {
    // Create a ground plane
    const groundGeometry = new THREE.PlaneGeometry(200, 200);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x228B22, // Green color for ground
      roughness: 0.8
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2; // Rotate to be horizontal
    ground.receiveShadow = true;
    this.scene.add(ground);
    
    // Add ambient light (brighter)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambientLight);
    
    // Add directional light (sunlight)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = true;
    
    // Improve shadow quality
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -100;
    directionalLight.shadow.camera.right = 100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;
    
    this.scene.add(directionalLight);
    
    // Add fog to the scene for atmosphere (less dense)
    this.scene.fog = new THREE.FogExp2(0xcccccc, 0.01);
    
    // Add environment decorations
    this.addTrees();
    this.addRocks();
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

  /**
   * Gets the THREE.js scene for use by other systems
   */
  public getScene(): THREE.Scene {
    return this.scene;
  }

  /**
   * Gets the camera for use by other systems
   */
  public getCamera(): THREE.PerspectiveCamera {
    return this.camera;
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

  public setCameraPosition(x: number, _y: number, z: number): void {
    // Position camera at a third-person perspective following the player
    // Increased height and distance for a more zoomed out view
    const cameraHeight = 25;      // Height above the player (increased from 15)
    const cameraDistance = 25;    // Distance behind the player (increased from 15)
    
    this.camera.position.set(x, cameraHeight, z + cameraDistance);
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