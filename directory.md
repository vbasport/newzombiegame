zombie-survival-game/
├── src/                         # Client-side code
│   ├── components/              # Core game entities
│   │   ├── GameEngine.js        # Manages the game loop and coordinates systems
│   │   ├── Player.js            # Handles player state and behavior
│   │   ├── Zombie.js            # Manages zombie AI and state
│   │   └── Structure.js         # Represents player-built structures
│   ├── systems/                 # Systems that operate on components
│   │   ├── RenderingSystem.js   # Handles 3D rendering with Three.js
│   │   ├── InputSystem.js       # Processes user inputs (keyboard, mouse, touch)
│   │   └── NetworkSystem.js     # Manages client-server communication
│   ├── assets/                  # Game assets (textures, models)
│   └── main.js                  # Entry point for the client-side app
├── public/                      # Static files
│   ├── index.html               # HTML template
│   └── styles.css               # Basic styling
├── server/                      # Server-side code
│   ├── index.js                 # Server setup with Node.js and Socket.io
│   └── gameState.js             # Manages the centralized game state
└── package.json                 # Project dependencies and scripts