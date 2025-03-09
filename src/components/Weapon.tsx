// This file handles weapon properties and behavior
import * as THREE from 'three';

// Weapon types enum
export enum WeaponType {
  PISTOL = 'pistol',
  SHOTGUN = 'shotgun',
  RIFLE = 'rifle',
  // Add more weapon types as needed
}

// Weapon class to handle different weapon properties
export class Weapon {
  public type: WeaponType;
  public damage: number;
  public fireRate: number; // Shots per second
  public cooldown: number; // Seconds between shots (1 / fireRate)
  public range: number;
  public accuracy: number; // 0-1, where 1 is perfect accuracy
  public ammo: number;
  public maxAmmo: number;
  public mesh: THREE.Group;
  
  constructor(type: WeaponType = WeaponType.PISTOL) {
    this.type = type;
    
    // Set default properties based on weapon type
    switch (type) {
      case WeaponType.PISTOL:
        this.damage = 50;
        this.fireRate = 2; // 2 shots per second
        this.cooldown = 1 / this.fireRate;
        this.range = 50;
        this.accuracy = 0.9;
        this.ammo = 12;
        this.maxAmmo = 12;
        break;
      case WeaponType.SHOTGUN:
        this.damage = 25; // Per pellet, typically fires multiple pellets
        this.fireRate = 1; // 1 shot per second
        this.cooldown = 1 / this.fireRate;
        this.range = 20;
        this.accuracy = 0.7;
        this.ammo = 8;
        this.maxAmmo = 8;
        break;
      case WeaponType.RIFLE:
        this.damage = 35;
        this.fireRate = 5; // 5 shots per second
        this.cooldown = 1 / this.fireRate;
        this.range = 80;
        this.accuracy = 0.85;
        this.ammo = 30;
        this.maxAmmo = 30;
        break;
      default:
        // Default to pistol if unknown type
        this.damage = 50;
        this.fireRate = 2;
        this.cooldown = 1 / this.fireRate;
        this.range = 50;
        this.accuracy = 0.9;
        this.ammo = 12;
        this.maxAmmo = 12;
        break;
    }
    
    // Create weapon mesh
    this.mesh = this.createWeaponMesh();
  }
  
  /**
   * Create a mesh for the weapon based on its type
   */
  private createWeaponMesh(): THREE.Group {
    const weaponGroup = new THREE.Group();
    
    // Create different meshes based on weapon type
    switch (this.type) {
      case WeaponType.PISTOL:
        // Create a simple pistol shape
        const barrelGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.4, 8);
        const barrelMaterial = new THREE.MeshStandardMaterial({
          color: 0x222222,
          metalness: 0.7,
          roughness: 0.3
        });
        const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
        barrel.rotation.x = Math.PI / 2; // Orient horizontally
        barrel.position.set(0, 0, 0.2); // Position in front
        
        const handleGeometry = new THREE.BoxGeometry(0.08, 0.2, 0.12);
        const handleMaterial = new THREE.MeshStandardMaterial({
          color: 0x663300,
          metalness: 0.1,
          roughness: 0.8
        });
        const handle = new THREE.Mesh(handleGeometry, handleMaterial);
        handle.position.set(0, -0.15, 0); // Position below barrel
        
        weaponGroup.add(barrel);
        weaponGroup.add(handle);
        break;
        
      case WeaponType.SHOTGUN:
        // Create a shotgun shape
        const shotgunBarrelGeometry = new THREE.CylinderGeometry(0.06, 0.06, 0.7, 8);
        const shotgunBarrelMaterial = new THREE.MeshStandardMaterial({
          color: 0x222222,
          metalness: 0.7,
          roughness: 0.3
        });
        const shotgunBarrel = new THREE.Mesh(shotgunBarrelGeometry, shotgunBarrelMaterial);
        shotgunBarrel.rotation.x = Math.PI / 2; // Orient horizontally
        shotgunBarrel.position.set(0, 0, 0.35); // Position in front
        
        const stockGeometry = new THREE.BoxGeometry(0.08, 0.15, 0.4);
        const stockMaterial = new THREE.MeshStandardMaterial({
          color: 0x663300,
          metalness: 0.1,
          roughness: 0.8
        });
        const stock = new THREE.Mesh(stockGeometry, stockMaterial);
        stock.position.set(0, -0.1, -0.1); // Position below and behind barrel
        
        weaponGroup.add(shotgunBarrel);
        weaponGroup.add(stock);
        break;
        
      case WeaponType.RIFLE:
        // Create a rifle shape
        const rifleBarrelGeometry = new THREE.CylinderGeometry(0.04, 0.04, 0.8, 8);
        const rifleBarrelMaterial = new THREE.MeshStandardMaterial({
          color: 0x222222,
          metalness: 0.7,
          roughness: 0.3
        });
        const rifleBarrel = new THREE.Mesh(rifleBarrelGeometry, rifleBarrelMaterial);
        rifleBarrel.rotation.x = Math.PI / 2; // Orient horizontally
        rifleBarrel.position.set(0, 0, 0.4); // Position in front
        
        const rifleBodyGeometry = new THREE.BoxGeometry(0.1, 0.15, 0.5);
        const rifleBodyMaterial = new THREE.MeshStandardMaterial({
          color: 0x444444,
          metalness: 0.5,
          roughness: 0.5
        });
        const rifleBody = new THREE.Mesh(rifleBodyGeometry, rifleBodyMaterial);
        rifleBody.position.set(0, 0, 0); // Position at center
        
        const rifleStockGeometry = new THREE.BoxGeometry(0.08, 0.15, 0.3);
        const rifleStockMaterial = new THREE.MeshStandardMaterial({
          color: 0x663300,
          metalness: 0.1,
          roughness: 0.8
        });
        const rifleStock = new THREE.Mesh(rifleStockGeometry, rifleStockMaterial);
        rifleStock.position.set(0, -0.05, -0.3); // Position below and behind body
        
        weaponGroup.add(rifleBarrel);
        weaponGroup.add(rifleBody);
        weaponGroup.add(rifleStock);
        break;
        
      default:
        // Default to pistol if unknown type
        const defaultBarrelGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.4, 8);
        const defaultBarrelMaterial = new THREE.MeshStandardMaterial({
          color: 0x222222,
          metalness: 0.7,
          roughness: 0.3
        });
        const defaultBarrel = new THREE.Mesh(defaultBarrelGeometry, defaultBarrelMaterial);
        defaultBarrel.rotation.x = Math.PI / 2; // Orient horizontally
        defaultBarrel.position.set(0, 0, 0.2); // Position in front
        
        weaponGroup.add(defaultBarrel);
        break;
    }
    
    // Add a subtle glow to the weapon tip
    const glowGeometry = new THREE.SphereGeometry(0.03, 8, 8);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xff6600,
      transparent: true,
      opacity: 0.6
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    
    // Position at tip of weapon
    switch (this.type) {
      case WeaponType.PISTOL:
        glow.position.set(0, 0, 0.4);
        break;
      case WeaponType.SHOTGUN:
        glow.position.set(0, 0, 0.7);
        break;
      case WeaponType.RIFLE:
        glow.position.set(0, 0, 0.8);
        break;
      default:
        glow.position.set(0, 0, 0.4);
        break;
    }
    
    weaponGroup.add(glow);
    
    return weaponGroup;
  }
  
  /**
   * Check if the weapon can fire (has ammo)
   */
  public canFire(): boolean {
    return this.ammo > 0;
  }
  
  /**
   * Fire the weapon, consuming ammo
   * @returns Whether the weapon successfully fired
   */
  public fire(): boolean {
    if (this.canFire()) {
      this.ammo--;
      return true;
    }
    return false;
  }
  
  /**
   * Reload the weapon, restoring ammo to max
   */
  public reload(): void {
    this.ammo = this.maxAmmo;
  }
  
  /**
   * Get the position of the weapon tip for bullet origin
   * @param playerPosition The position of the player
   * @param direction The direction the player is facing
   */
  public getWeaponTipPosition(playerPosition: THREE.Vector3, direction: THREE.Vector3): THREE.Vector3 {
    // Calculate weapon tip position based on player position and direction
    const tipOffset = new THREE.Vector3();
    
    switch (this.type) {
      case WeaponType.PISTOL:
        tipOffset.set(direction.x * 0.6, 0.75, direction.z * 0.6);
        break;
      case WeaponType.SHOTGUN:
        tipOffset.set(direction.x * 0.9, 0.75, direction.z * 0.9);
        break;
      case WeaponType.RIFLE:
        tipOffset.set(direction.x * 1.0, 0.75, direction.z * 1.0);
        break;
      default:
        tipOffset.set(direction.x * 0.6, 0.75, direction.z * 0.6);
        break;
    }
    
    return new THREE.Vector3(
      playerPosition.x + tipOffset.x,
      playerPosition.y + tipOffset.y,
      playerPosition.z + tipOffset.z
    );
  }
} 