import * as THREE from 'three';
import InputSystem from '../systems/InputSystem';

class Player {
  private mesh: THREE.Mesh;

  constructor() {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.y = 0.5; // Above ground
  }

  public getMesh() {
    return this.mesh;
  }

  public update(deltaTime: number, inputSystem: InputSystem) {
    const speed = 5;
    if (inputSystem.isKeyPressed('w')) this.mesh.position.z -= speed * deltaTime;
    if (inputSystem.isKeyPressed('s')) this.mesh.position.z += speed * deltaTime;
    if (inputSystem.isKeyPressed('a')) this.mesh.position.x -= speed * deltaTime;
    if (inputSystem.isKeyPressed('d')) this.mesh.position.x += speed * deltaTime;
  }
}

export default Player;