// This file handles physics simulation for all entities in the game
import * as CANNON from 'cannon-es';
import * as THREE from 'three';

// Interface for objects that can have physics applied to them
export interface PhysicsObject {
  mesh: THREE.Object3D;
  body?: CANNON.Body;
  isAlive: boolean;
  updateFromPhysics?: (position: CANNON.Vec3, quaternion: CANNON.Quaternion) => void;
}

class PhysicsSystem {
  private world: CANNON.World;
  private timeStep: number = 1/60; // Physics update rate (60 times per second)
  private gravity: number = 9.8; // Earth gravity in m/s²
  private bodies: Map<THREE.Object3D, CANNON.Body> = new Map();
  private debugMode: boolean = false;
  private cannonDebugger: any = null;

  constructor() {
    // Create physics world
    this.world = new CANNON.World({
      gravity: new CANNON.Vec3(0, -this.gravity, 0)
    });

    // Set up collision detection
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    
    // Enable sleeping for better performance
    this.world.allowSleep = true;

    // Create ground plane
    this.createGround();
  }

  // Get the physics world - needed for entity initialization
  public getWorld(): CANNON.World {
    return this.world;
  }

  private createGround(): void {
    // Create a static ground plane
    const groundShape = new CANNON.Plane();
    const groundBody = new CANNON.Body({
      mass: 0, // Mass of 0 makes it static
      shape: groundShape,
      type: CANNON.BODY_TYPES.STATIC
    });
    
    // Rotate the ground plane to be horizontal (facing up)
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    
    // Add ground to world
    this.world.addBody(groundBody);
  }

  // Add a physics body for an entity
  public addBody(entity: PhysicsObject, options: {
    mass: number,
    shape: CANNON.Shape,
    position?: CANNON.Vec3,
    type?: CANNON.BodyType,
    material?: CANNON.Material
  }): void {
    // Create physics body
    const body = new CANNON.Body({
      mass: options.mass,
      shape: options.shape,
      type: options.type || CANNON.Body.DYNAMIC,
      material: options.material || new CANNON.Material()
    });

    // Set initial position
    if (options.position) {
      body.position.copy(options.position);
    } else if (entity.mesh) {
      body.position.set(
        entity.mesh.position.x,
        entity.mesh.position.y,
        entity.mesh.position.z
      );
    }

    // Store association between mesh and body
    this.bodies.set(entity.mesh, body);
    
    // Attach body to entity for direct access
    entity.body = body;
    
    // Add body to the physics world
    this.world.addBody(body);
  }

  // Remove a physics body
  public removeBody(entity: PhysicsObject): void {
    if (entity.mesh && this.bodies.has(entity.mesh)) {
      const body = this.bodies.get(entity.mesh);
      if (body) {
        this.world.removeBody(body);
        this.bodies.delete(entity.mesh);
      }
    }
  }

  // Apply impulse force to a body (for jumps, knockbacks, etc.)
  public applyImpulse(entity: PhysicsObject, impulse: CANNON.Vec3, worldPoint?: CANNON.Vec3): void {
    const body = entity.body || this.bodies.get(entity.mesh);
    if (body) {
      body.applyImpulse(impulse, worldPoint || body.position);
    }
  }

  // Apply force to a body
  public applyForce(entity: PhysicsObject, force: CANNON.Vec3, worldPoint?: CANNON.Vec3): void {
    const body = entity.body || this.bodies.get(entity.mesh);
    if (body) {
      body.applyForce(force, worldPoint || body.position);
    }
  }

  // Update physics simulation
  public update(deltaTime: number, entities: PhysicsObject[]): void {
    // Step the physics world
    this.world.step(this.timeStep, deltaTime, 3);
    
    // Update entities with physics results
    for (const entity of entities) {
      if (!entity.isAlive) continue;
      
      const body = entity.body || this.bodies.get(entity.mesh);
      if (body && entity.mesh) {
        if (entity.updateFromPhysics) {
          // Use entity's custom update method if available
          entity.updateFromPhysics(body.position, body.quaternion);
        } else {
          // Default update method
          entity.mesh.position.set(body.position.x, body.position.y, body.position.z);
          entity.mesh.quaternion.set(
            body.quaternion.x,
            body.quaternion.y,
            body.quaternion.z,
            body.quaternion.w
          );
        }
      }
    }

    // Update debug renderer if enabled
    if (this.debugMode && this.cannonDebugger) {
      this.cannonDebugger.update();
    }
  }

  /**
   * Enable debug visualization for physics bodies
   * @param _scene The Three.js scene (unused but kept for API compatibility)
   */
  public enableDebug(_scene: THREE.Scene): void {
    this.debugMode = true;
    console.log('Physics debug mode enabled');
    
    // Implement debug visualization if needed
    // For example, you could use cannon-es-debugger here
  }
}

export default PhysicsSystem; 