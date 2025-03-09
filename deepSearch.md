### Key Points
- Research suggests three.js is suitable for building multiplayer games on both mobile and desktop, with recent developments focusing on integrating real-time communication like WebSockets for scalability.
- It seems likely that using Supabase for backend services, including authentication and saved progression, will support the game's needs effectively.
- The evidence leans toward a client-server architecture with Node.js and Socket.io for real-time updates, ensuring smooth multiplayer interactions on both keyboard/mouse and touch inputs.

### Game Plan Overview
This plan outlines building a multiplayer top-down zombie apocalypse survival game using three.js, with Supabase for backend services. The game will feature waves of enemy zombies, player-built defenses, traps, and bunkers, and upgrades for weapons and characters, ensuring scalability and saved progression on both mobile and desktop devices.

#### Input Handling
- **Desktop:** Use keyboard (WASD for movement) and mouse for interactions like structure placement, with raycasting for precise positioning.
- **Mobile:** Implement on-screen controls for movement (e.g., virtual joysticks) and touch for interactions, detecting mobile devices via touch support to switch input methods.

#### Architecture
- **Client-Side:** Render the 3D scene with three.js, handle inputs based on device type, and communicate with the server via Socket.io for real-time updates.
- **Server-Side:** Manage game state with Node.js and Socket.io, run a 60 Hz game loop, and integrate with Supabase for authentication and data persistence.
- **Database (Supabase):** Store player data (progress, inventory) and handle logins, ensuring secure access control.

This approach balances complexity with functionality, leveraging recent developments in three.js for real-time graphics and Supabase for robust backend support, while accommodating both desktop and mobile inputs.

---

### Survey Note: Detailed Analysis and Implementation Strategy

This section provides a comprehensive analysis of building a multiplayer top-down zombie apocalypse survival game using three.js, with Supabase for backend services, ensuring compatibility with both mobile web applications and computer keyboard/mouse inputs. It covers recent developments, best practices, and a detailed architecture plan, ensuring scalability and feature implementation as of March 8, 2025.

#### Recent Developments in three.js and Multiplayer Games
Recent advancements in three.js, as of March 2025, emphasize its suitability for real-time 3D graphics in browsers, particularly for games. The library's integration with WebSockets for multiplayer functionality has seen significant adoption, with projects like [THREE.Multiplayer](https://github.com/juniorxsound/THREE.Multiplayer) providing boilerplates for real-time communication. Discussions on [three.js forum](https://discourse.threejs.org/) highlight custom cursor implementations, such as 3D models following the mouse, which can enhance user interaction in games. For mobile, three.js supports touch events, with resources like [MDN mobile touch controls](https://developer.mozilla.org/en-US/docs/Games/Techniques/Control_mechanisms/Mobile_touch) detailing how to implement touch-based inputs, ensuring compatibility with modern mobile browsers.

#### Best Practices for Multiplayer Game Development Across Devices
Research suggests several best practices for building multiplayer games with three.js, considering both desktop and mobile:
- **Client-Server Architecture:** Use a centralized server to manage game state, ensuring consistency and preventing cheating. Node.js with Socket.io is recommended for real-time updates, as seen in [Building multiplayer games with socket.io](https://www.seangoedecke.com/socket-io-game/).
- **Real-Time Communication:** WebSockets are suitable for low-latency interactions, with a tick rate of 60 Hz suggested for smooth gameplay, as discussed in [Are WebSockets suitable for real-time multiplayer games?](https://stackoverflow.com/questions/8161053/are-websockets-suitable-for-real-time-multiplayer-games).
- **Input Handling:** For desktop, handle keyboard (WASD) and mouse inputs, using raycasting for interactions. For mobile, implement touch events and on-screen controls, detecting device type via `ontouchstart` in window, as noted in [three.js mobile input discussions](https://discourse.threejs.org/t/touch-in-three-js/23382).
- **Scalability:** For large player counts, consider spatial partitioning to limit data sent to each client, reducing network load. This is crucial for games with dynamic elements like zombie waves.
- **Backend Integration:** Supabase, offering PostgreSQL and authentication, is ideal for storing player progress and handling logins, as detailed in [Supabase documentation](https://supabase.com/docs).

#### Detailed Architecture Plan
The architecture is divided into client-side, server-side, and database components, ensuring a scalable and feature-rich game across devices.

##### Client-Side Implementation
- **Three.js Scene Setup:** Create a scene with a top-down view using a PerspectiveCamera at position (0,10,0) with rotation.x = -Math.PI/2, looking down on the x-z plane. Add a ground plane with rotation.x = -Math.PI/2 for visibility, and include directional lighting for realism.
- **Input Handling:** 
  - **Desktop:** Implement movement using WASD keys, transforming local directions (forward: (0,0,1), right: (1,0,0)) to world coordinates via the player's matrix for accurate positioning. Use PointerLockControls for mouse-based interactions, updating player.rotation.y based on mouse deltas for smooth turning.
  - **Mobile:** Detect mobile devices by checking `if ('ontouchstart' in window)`, and show on-screen controls (e.g., virtual joysticks using libraries like [Virtual Joystick](https://github.com/jeromeetienne/virtualjoystick.js)). Handle touch events for raycasting, similar to mouse clicks, for structure placement.
- **Interaction Mechanics:** Use raycasting for structure placement, casting rays from the camera through mouse/touch clicks to intersect with the ground plane, determining placement positions. Render player-built defenses, traps, and bunkers as 3D models added to the scene.
- **Real-Time Updates:** Connect to the server via Socket.io, sending movement inputs (e.g., {"moveForward": true, "rotationDelta": delta_x}) and receiving game state updates to synchronize local rendering with server data.

##### Server-Side Implementation
- **Node.js and Socket.io Setup:** Use Express.js to serve client files and Socket.io for real-time communication. Handle client connections, assigning unique IDs and managing disconnections.
- **Game State Management:** Maintain a game state object including:
  - Players: List with ID, position (Vector3), rotation (y-axis), health, etc.
  - Zombies: List with ID, position, state (alive/dead), target player, etc.
  - Structures: List with type (defense/trap/bunker), position, health, etc.
- **Game Loop:** Implement a 60 Hz game loop using setTimeout, processing inputs:
  - Update player positions based on movement commands, applying velocity in world coordinates.
  - Update zombie AI, such as pathfinding towards players or random movement, using simple algorithms.
  - Check collisions (e.g., player-zombie, structure placement validation) and handle interactions (attacks, building).
  - Broadcast updated game state as JSON to all clients, potentially optimizing by sending deltas for efficiency.
- **Supabase Integration:** Use the Supabase client library to handle authentication (login/registration via auth API) and store/retrieve player data (progress, inventory) in tables like:
  - Players: id, username, email, password (hashed), progress (JSON), inventory (JSON).

##### Scalability Considerations
To ensure the game scales, consider:
- **Spatial Partitioning:** Divide the game world into regions, sending only relevant data (e.g., nearby players, zombies) to each client, reducing network load for large player counts.
- **Data Optimization:** Minimize network data by sending position changes rather than full state, using efficient JSON structures.
- **Server Load Balancing:** For high concurrency, deploy multiple server instances, potentially using load balancers, though this is beyond initial scope.

##### Feature Implementation
- **Building Mechanics:** Players select positions via mouse/touch clicks, sending coordinates to the server. The server validates (e.g., no overlap with existing structures) and adds to game state, broadcasting updates. Render structures as 3D models (e.g., cubes for bunkers, meshes for traps) on the client.
- **Upgrading Mechanics:** Players send upgrade requests (e.g., weapon level, character stats) to the server, which checks resources in Supabase, updates player data, and reflects changes in game state. Clients update local stats based on server updates.
- **Zombie Waves:** Implement waves by spawning zombies at intervals, managed by the server, with increasing difficulty (e.g., more zombies, faster movement) over time.
- **Mobile Compatibility:** Ensure UI elements are touch-friendly, with larger buttons and clear labels, and test performance on lower-end mobile devices to optimize rendering.

#### Tables for Clarity
Below is a table summarizing key components and their responsibilities:

| **Component**       | **Responsibility**                                      |
|---------------------|--------------------------------------------------------|
| Client (three.js)   | Render game world, handle inputs, send commands, update based on server state |
| Server (Node.js)    | Manage game state, process inputs, broadcast updates, integrate with Supabase |
| Database (Supabase) | Store player data (progress, inventory), handle authentication |

Another table for game state entities:

| **Entity**  | **Attributes**                              | **Example Usage**                     |
|-------------|---------------------------------------------|---------------------------------------|
| Player      | ID, Position, Rotation, Health, Inventory   | Move, build, upgrade, fight zombies   |
| Zombie      | ID, Position, State, Target Player          | Pathfind, attack players, die         |
| Structure   | Type, Position, Health                      | Defend, trap zombies, provide cover   |

#### Conclusion
This detailed plan leverages recent three.js developments for real-time graphics and Cursor interactions, ensuring a robust multiplayer experience on both desktop and mobile. Supabase integration supports authentication and data persistence, while the client-server architecture with Node.js and Socket.io handles scalability and synchronization. The approach addresses all user requirements, including mobile web application support and computer keyboard/mouse inputs, with a focus on performance and user experience.

#### Key Citations
- [THREE.Multiplayer boilerplate server and client setup](https://github.com/juniorxsound/THREE.Multiplayer)
- [Building multiplayer games with socket.io and HTML5 Canvas](https://www.seangoedecke.com/socket-io-game/)
- [Are WebSockets suitable for real-time multiplayer games?](https://stackoverflow.com/questions/8161053/are-websockets-suitable-for-real-time-multiplayer-games)
- [Supabase documentation for authentication and database](https://supabase.com/docs)
- [three.js forum discussions on cursor interactions](https://discourse.threejs.org/)
- [MDN mobile touch controls for games](https://developer.mozilla.org/en-US/docs/Games/Techniques/Control_mechanisms/Mobile_touch)
- [three.js mobile input discussions](https://discourse.threejs.org/t/touch-in-three-js/23382)