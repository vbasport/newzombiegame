// This file is the entry point for the application
import './style.css';
import App from './App';

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  const rootElement = document.getElementById('root');
  
  if (rootElement) {
    // Create a canvas element for the game
    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100vh';
    canvas.style.display = 'block';
    
    // Append the canvas to the root element
    rootElement.appendChild(canvas);
    
    // Initialize the App with the canvas
    const app = new App();
    app.init(canvas);
  } else {
    console.error('Root element not found');
  }
});