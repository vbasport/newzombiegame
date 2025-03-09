// This file handles network communication between the game client and server
// using socket.io for real-time bidirectional event-based communication

import { io, Socket } from 'socket.io-client';

// NetworkSystem class for handling network communication in the game engine
class NetworkSystem {
  private socket: Socket | null = null;
  private playerName: string;
  private activePlayers: number = 1; // Start with at least the local player
  private isConnected: boolean = false;
  private serverAvailable: boolean = false;
  private connectionAttempted: boolean = false;

  constructor(playerName: string = 'Player') {
    this.playerName = playerName;
    
    // Try to connect to the server, but handle the case when it's not available
    this.connectToServer();
  }
  
  /**
   * Attempt to connect to the server with error handling
   */
  private connectToServer(): void {
    try {
      // Check if server is available first to avoid CORS errors
      this.checkServerAvailability().then(available => {
        if (available) {
          this.initializeSocket();
        } else {
          console.log('Server not available, running in single-player mode');
          this.connectionAttempted = true;
        }
      });
    } catch (error) {
      console.error('Error connecting to server:', error);
      this.connectionAttempted = true;
    }
  }
  
  /**
   * Check if the server is available before attempting to connect
   */
  private async checkServerAvailability(): Promise<boolean> {
    try {
      // Use a simple fetch with a timeout to check if server is available
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      
      const response = await fetch('http://localhost:3000/health', {
        signal: controller.signal,
        mode: 'no-cors' // This will prevent CORS errors during the check
      });
      
      clearTimeout(timeoutId);
      this.serverAvailable = true;
      return true;
    } catch (error) {
      console.log('Server health check failed, assuming server is not available');
      this.serverAvailable = false;
      return false;
    }
  }
  
  /**
   * Initialize the socket connection
   */
  private initializeSocket(): void {
    try {
      this.socket = io('http://localhost:3000', {
        query: { playerName: this.playerName },
        reconnectionAttempts: 3,
        timeout: 5000
      });
      
      this.socket.on('connect', () => {
        console.log(`Connected to server as ${this.playerName}!`);
        this.isConnected = true;
        
        // Announce player joining
        this.socket?.emit('playerJoin', { playerName: this.playerName });
      });
      
      // Listen for player count updates from server
      this.socket.on('playerCount', (data: { count: number }) => {
        this.activePlayers = data.count;
        console.log(`Active players: ${this.activePlayers}`);
      });
      
      // Handle disconnection
      this.socket.on('disconnect', () => {
        console.log('Disconnected from server');
        this.isConnected = false;
      });
      
      // Handle connection errors
      this.socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        this.isConnected = false;
        this.connectionAttempted = true;
      });
    } catch (error) {
      console.error('Error initializing socket:', error);
      this.connectionAttempted = true;
    }
  }

  // Send player actions to the server
  public sendInput(input: any) {
    if (this.isConnected && this.socket) {
      this.socket.emit('playerInput', {
        ...input,
        playerName: this.playerName
      });
    }
  }

  // Receive game updates from the server
  public onGameStateUpdate(callback: (state: any) => void) {
    if (this.socket) {
      this.socket.on('gameState', callback);
    }
  }
  
  // Listen for player count updates
  public onPlayerCountUpdate(callback: (count: number) => void) {
    // Initial callback with current count
    callback(this.activePlayers);
    
    // Listen for future updates if connected
    if (this.socket) {
      this.socket.on('playerCount', (data: { count: number }) => {
        this.activePlayers = data.count;
        callback(this.activePlayers);
      });
    }
  }
  
  // Listen for other player updates
  public onPlayerUpdate(callback: (players: any[]) => void) {
    if (this.socket) {
      this.socket.on('playerUpdates', callback);
    } else {
      // In single-player mode, just return an empty array
      callback([]);
    }
  }
  
  // Send player position update to server
  public sendPlayerUpdate(position: { x: number, y: number, z: number }, rotation: number) {
    if (this.isConnected && this.socket) {
      this.socket.emit('playerUpdate', {
        playerName: this.playerName,
        position,
        rotation
      });
    }
  }
  
  // Get the player's name
  public getPlayerName(): string {
    return this.playerName;
  }
  
  // Get the current number of active players
  public getActivePlayers(): number {
    return this.activePlayers;
  }
  
  // Check if connected to server
  public isServerConnected(): boolean {
    return this.isConnected;
  }
  
  // Check if connection has been attempted
  public hasConnectionBeenAttempted(): boolean {
    return this.connectionAttempted;
  }
  
  // Cleanup resources
  public cleanup(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export default NetworkSystem;