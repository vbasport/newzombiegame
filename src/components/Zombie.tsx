import * as THREE from 'three';

class Zombie {
  private mesh: THREE.Mesh;

  constructor(position: THREE.Vector3) {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(position);
    this.mesh.position.y = 0.5; // Above ground
  }

  public getMesh() {
    return this.mesh;
  }

  public update(deltaTime: number, playerPos: THREE.Vector3) {
    const direction = playerPos.clone().sub(this.mesh.position).normalize();
    const speed = 2; // Slower than player
    this.mesh.position.add(direction.multiplyScalar(speed * deltaTime));
  }
}

export default Zombie;