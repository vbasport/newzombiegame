import RenderingSystem from '../systems/RenderingSystem';
import InputSystem from '../systems/InputSystem';
import Player from './Player';
import Zombie from './Zombie';
import * as THREE from 'three';

class GameEngine {
  private renderingSystem: RenderingSystem;
  private inputSystem: InputSystem;
  private player: Player;
  private zombie: Zombie;
  private lastTime: number = 0;

  constructor() {
    this.renderingSystem = new RenderingSystem();
    this.inputSystem = new InputSystem();
    this.player = new Player();
    this.zombie = new Zombie(new THREE.Vector3(5, 0, 5)); // Start 5 units away
    this.renderingSystem.addToScene(this.player.getMesh());
    this.renderingSystem.addToScene(this.zombie.getMesh());
  }

  public start() {
    this.lastTime = performance.now();
    requestAnimationFrame(this.loop.bind(this));
  }

  private loop(currentTime: number) {
    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    this.player.update(deltaTime, this.inputSystem);
    const playerPos = this.player.getMesh().position;
    this.zombie.update(deltaTime, playerPos);
    this.renderingSystem.setCameraPosition(playerPos.x, 20, playerPos.z);

    this.renderingSystem.render();
    requestAnimationFrame(this.loop.bind(this));
  }
}

export default GameEngine;