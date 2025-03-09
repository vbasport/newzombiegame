// This file handles combat interactions between entities
import * as THREE from 'three';

interface Entity {
  isAlive: boolean;
  health: number;
  getMesh(): THREE.Object3D;
}

class CombatSystem {
  constructor() {
    // No initialization needed for now
  }
  
  public update(entities: Entity[]): void {
    this.removeDeadEntities(entities);
  }
  
  private removeDeadEntities(_entities: Entity[]): void {
    // Implementation will be added later
    // The parameter is prefixed with _ to indicate it's intentionally unused for now
  }
}

export default CombatSystem;
