# Zombie Survival Game - Directory Structure

```
zombie-survival-game/
├── public/                  # Static public assets
├── src/                     # Source code
│   ├── assests/             # Game assets
│   │   ├── background_music.mp3
│   │   └── zombie.png
│   ├── components/          # Game components
│   │   ├── GameEngine.tsx   # Main game engine component
│   │   ├── Player.tsx       # Player entity component
│   │   └── Zombie.tsx       # Zombie entity component
│   ├── systems/             # Game systems
│   │   ├── CombatSystem.tsx     # Handles combat mechanics
│   │   ├── InputSystem.tsx      # Processes user input
│   │   ├── MovementSystem.tsx   # Handles entity movement
│   │   ├── NetworkSystem.tsx    # Manages network communication
│   │   └── RenderingSystem.tsx  # Handles game rendering
│   ├── App.tsx              # Main application component
│   ├── counter.ts           # Counter utility
│   ├── main.ts              # Application entry point
│   ├── style.css            # Global styles
│   ├── typescript.svg       # TypeScript logo
│   └── vite-env.d.ts        # Vite environment type declarations
├── index.html               # HTML entry point
├── tsconfig.json            # TypeScript configuration
├── package.json             # NPM package configuration
├── package-lock.json        # NPM package lock
├── .gitignore               # Git ignore file
├── architecture.md          # Architecture documentation
├── Game-Plan.md             # Game planning documentation
└── roadmap.md               # Development roadmap
```

## System Architecture

The game follows a component-based architecture with clean separation of concerns:

### Components
- **GameEngine.tsx**: Central game loop and state management
- **Player.tsx**: Player character representation and properties
- **Zombie.tsx**: Zombie enemy representation and properties

### Systems
- **InputSystem.tsx**: Captures and processes user inputs
- **MovementSystem.tsx**: Handles entity movement and physics
- **CombatSystem.tsx**: Manages combat mechanics, damage, and health
- **RenderingSystem.tsx**: Handles visual rendering of game elements
- **NetworkSystem.tsx**: Manages client-server communication for multiplayer

This architecture promotes:
- **Modularity**: Each system handles a specific aspect of gameplay
- **Reusability**: Components and systems can be reused across different parts of the game
- **Testability**: Clean separation makes it easier to test individual components
- **Maintainability**: Easy to update or extend specific systems without affecting others 