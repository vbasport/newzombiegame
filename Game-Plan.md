Multiplayer Zombie Apocalypse Survival Game: Plan and Architecture
Table of Contents
Key Points
Game Plan Overview
Input Handling
Architecture
Survey Note: Detailed Analysis and Implementation Strategy
Recent Developments in Three.js and Multiplayer Games
Best Practices for Multiplayer Game Development Across Devices
Detailed Architecture Plan
Client-Side Implementation
Server-Side Implementation
Scalability Considerations
Feature Implementation
Tables for Clarity
Conclusion
Key Citations
Key Points
Three.js is ideal for building multiplayer games on both mobile and desktop, leveraging recent advancements in real-time communication via WebSockets for scalability.
Supabase provides robust backend services, including authentication and saved progression, meeting the game's data needs efficiently.
A client-server architecture with Node.js and Socket.io ensures seamless multiplayer interactions across devices, supporting real-time updates for keyboard/mouse and touch inputs.
Game Plan Overview
This plan outlines the development of a multiplayer top-down zombie apocalypse survival game using Three.js and Supabase. The game features waves of enemy zombies, player-built defenses, traps, bunkers, and upgrades for weapons and characters, with scalability and saved progression across mobile and desktop platforms.

Input Handling
Desktop:
Movement via WASD keys.
Mouse for interactions (e.g., structure placement using raycasting).
Mobile:
On-screen controls (e.g., virtual joysticks).
Touch inputs for interactions, with device detection to switch input methods dynamically.
Architecture
Client-Side:
Uses Three.js to render the 3D scene.
Manages device-specific inputs.
Communicates with the server via Socket.io for real-time synchronization.
Server-Side:
Runs on Node.js with Socket.io for game state management and a 60 Hz game loop.
Integrates with Supabase for authentication and data persistence.
Database (Supabase):
Stores player data (progress, inventory).
Manages secure logins and access control.
This architecture balances complexity and functionality, leveraging Three.js for real-time graphics and Supabase for backend support, while ensuring compatibility with both desktop and mobile inputs.

Survey Note: Detailed Analysis and Implementation Strategy
This section provides an in-depth analysis and strategy for building the game, ensuring compatibility with mobile web applications and desktop keyboard/mouse inputs. It incorporates recent developments, best practices, and a detailed architecture plan as of March 8, 2025.

Recent Developments in Three.js and Multiplayer Games
As of March 2025, Three.js has solidified its role in browser-based 3D graphics, particularly for games. Its integration with WebSockets, as seen in projects like THREE.Multiplayer, supports real-time multiplayer functionality. Community discussions on the Three.js forum highlight advanced input handling, such as custom 3D cursors, enhancing interactivity. For mobile, Three.js supports touch events, with resources like MDN mobile touch controls offering guidance on touch-based inputs for modern browsers.

Best Practices for Multiplayer Game Development Across Devices
Key best practices include:

Client-Server Architecture: A centralized server (Node.js with Socket.io) manages game state for consistency and security, as recommended in Building multiplayer games with socket.io.
Real-Time Communication: WebSockets with a 60 Hz tick rate ensure low-latency gameplay, per Are WebSockets suitable for real-time multiplayer games?.
Input Handling:
Desktop: WASD keys and mouse with raycasting.
Mobile: Touch events and on-screen controls, detected via ontouchstart (Three.js mobile input discussions).
Scalability: Spatial partitioning reduces network load for large player counts.
Backend Integration: Supabase handles authentication and data storage efficiently (Supabase documentation).
Detailed Architecture Plan
The architecture splits into client-side, server-side, and database components, ensuring scalability and feature richness.

Client-Side Implementation
Three.js Scene Setup:
Top-down view with a PerspectiveCamera at (0,10,0), rotated to x = -Math.PI/2.
Ground plane with rotation.x = -Math.PI/2 and directional lighting.
Input Handling:
Desktop: WASD for movement (transformed to world coordinates), PointerLockControls for mouse-based rotation and raycasting.
Mobile: Device detection ('ontouchstart' in window), virtual joysticks, and touch-based raycasting for interactions.
Interaction Mechanics: Raycasting determines structure placement positions, rendering defenses, traps, and bunkers as 3D models.
Real-Time Updates: Socket.io sends inputs (e.g., {"moveForward": true, "rotationDelta": delta_x}) and receives game state updates.
Server-Side Implementation
Node.js and Socket.io:
Express.js serves client files, Socket.io manages connections with unique IDs.
Game State Management:
Players: ID, position (Vector3), rotation (y-axis), health, inventory.
Zombies: ID, position, state, target player.
Structures: Type, position, health.
Game Loop:
60 Hz loop updates player positions, zombie AI (pathfinding), collisions, and interactions.
Broadcasts JSON game state updates (optimized with deltas).
Supabase Integration:
Authentication via Supabase auth API.
Stores player data in tables (e.g., Players: id, username, progress, inventory).
Scalability Considerations
Spatial Partitioning: Limits data to nearby entities, reducing network load.
Data Optimization: Sends position deltas instead of full state.
Server Load Balancing: Multiple instances for high concurrency (future consideration).
Feature Implementation
Building Mechanics: Players click/tap to send coordinates; server validates and updates state, clients render 3D models.
Upgrading Mechanics: Server checks resources in Supabase, updates stats, and syncs clients.
Zombie Waves: Server spawns zombies in waves with increasing difficulty.
Mobile Compatibility: Touch-friendly UI, optimized for lower-end devices.
Tables for Clarity
Key Components and Responsibilities:

Component	Responsibility
Client (Three.js)	Render game world, handle inputs, sync with server
Server (Node.js)	Manage game state, process inputs, integrate Supabase
Database (Supabase)	Store player data, handle authentication
Game State Entities:

Entity	Attributes	Example Usage
Player	ID, Position, Rotation, Health, Inventory	Move, build, upgrade, fight zombies
Zombie	ID, Position, State, Target Player	Pathfind, attack players, die
Structure	Type, Position, Health	Defend, trap zombies, provide cover
Conclusion
This plan leverages Three.js for real-time graphics and Supabase for backend support, ensuring a scalable multiplayer experience across desktop and mobile. The client-server architecture with Node.js and Socket.io addresses synchronization and scalability, meeting all requirements for input handling and feature implementation.

Key Citations
THREE.Multiplayer boilerplate
Building multiplayer games with socket.io
Are WebSockets suitable?
Supabase documentation
Three.js forum
MDN mobile touch controls
Three.js mobile input