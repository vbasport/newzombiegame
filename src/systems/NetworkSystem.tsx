// This file handles network communication between the game client and server
// using socket.io for real-time bidirectional event-based communication

import { io, Socket } from 'socket.io-client';
import { createContext, useContext, ReactNode, useState, useEffect } from 'react';

// Create a socket context for React components
const SocketContext = createContext<Socket | null>(null);

// Custom hook for accessing the socket in React components
export const useSocket = () => useContext(SocketContext);

// Socket provider component for React
export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const newSocket = io('http://localhost:3000'); // Update with your server URL later
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

// NetworkSystem class for handling network communication in the game engine
class NetworkSystem {
  private socket: Socket;

  constructor() {
    this.socket = io('http://localhost:3000'); // Update with your server URL later
    this.socket.on('connect', () => {
      console.log('Connected to server!');
    });
  }

  // Send player actions to the server
  public sendInput(input: any) {
    this.socket.emit('playerInput', input);
  }

  // Receive game updates from the server
  public onGameStateUpdate(callback: (state: any) => void) {
    this.socket.on('gameState', callback);
  }
}

export default NetworkSystem;