// This file is the main application entry point that handles game initialization
import GameEngine from './components/GameEngine';
import './App.css';
import { Analytics } from "@vercel/analytics/react";

class App {
  private gameEngine: GameEngine | null = null;
  private playerName: string | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private loginContainer: HTMLDivElement | null = null;
  
  /**
   * Initialize the application with a canvas element
   */
  public init(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    
    // Check if player name exists in session storage
    const storedName = sessionStorage.getItem('playerName');
    if (storedName) {
      this.playerName = storedName;
      this.startGame();
    } else {
      this.showLoginScreen();
    }
  }
  
  /**
   * Display the login screen to enter player name
   */
  private showLoginScreen(): void {
    // Hide the canvas
    if (this.canvas) {
      this.canvas.style.display = 'none';
    }
    
    // Create login container
    this.loginContainer = document.createElement('div');
    this.loginContainer.className = 'login-container';
    
    // Create login card
    const loginCard = document.createElement('div');
    loginCard.className = 'login-card';
    
    // Create title
    const title = document.createElement('h1');
    title.textContent = 'Zombie Survival';
    
    // Create subtitle
    const subtitle = document.createElement('h2');
    subtitle.textContent = 'Enter Your Name';
    
    // Create form
    const form = document.createElement('form');
    form.addEventListener('submit', this.handleLoginSubmit.bind(this));
    
    // Create form group
    const formGroup = document.createElement('div');
    formGroup.className = 'form-group';
    
    // Create input
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Your name (25 chars max)';
    input.maxLength = 25;
    input.required = true;
    input.autofocus = true;
    input.style.textAlign = 'center';
    
    // Create error message container
    const errorMessage = document.createElement('div');
    errorMessage.className = 'error-message';
    errorMessage.style.display = 'none';
    
    // Create submit button
    const button = document.createElement('button');
    button.type = 'submit';
    button.className = 'start-button';
    button.textContent = 'Start Game';
    
    // Assemble the form
    formGroup.appendChild(input);
    formGroup.appendChild(errorMessage);
    form.appendChild(formGroup);
    form.appendChild(button);
    
    // Assemble the login card
    loginCard.appendChild(title);
    loginCard.appendChild(subtitle);
    loginCard.appendChild(form);
    
    // Add to login container
    this.loginContainer.appendChild(loginCard);
    
    // Add to document
    document.getElementById('root')?.appendChild(this.loginContainer);
    
    // Focus the input
    input.focus();
  }
  
  /**
   * Handle login form submission
   */
  private handleLoginSubmit(event: SubmitEvent): void {
    event.preventDefault();
    
    const form = event.target as HTMLFormElement;
    const input = form.querySelector('input') as HTMLInputElement;
    const errorMessage = form.querySelector('.error-message') as HTMLDivElement;
    
    // Get and sanitize the player name
    const name = input.value.trim();
    
    // Validate name
    if (!name) {
      this.showError(errorMessage, 'Please enter a name');
      return;
    }
    
    if (name.length > 25) {
      this.showError(errorMessage, 'Name must be 25 characters or less');
      return;
    }
    
    // Check for potentially dangerous characters
    const dangerousPattern = /[<>{}()[\]\\\/]/;
    if (dangerousPattern.test(name)) {
      this.showError(errorMessage, 'Name contains invalid characters');
      return;
    }
    
    // Store the player name
    this.playerName = encodeURIComponent(name);
    sessionStorage.setItem('playerName', this.playerName);
    
    // Start the game
    this.startGame();
  }
  
  /**
   * Show an error message
   */
  private showError(element: HTMLDivElement, message: string): void {
    element.textContent = message;
    element.style.display = 'block';
    
    // Hide the error after 3 seconds
    setTimeout(() => {
      element.style.display = 'none';
    }, 3000);
  }
  
  /**
   * Start the game with the player name
   */
  private startGame(): void {
    // Remove login screen if it exists
    if (this.loginContainer) {
      document.getElementById('root')?.removeChild(this.loginContainer);
      this.loginContainer = null;
    }
    
    // Show the canvas
    if (this.canvas) {
      this.canvas.style.display = 'block';
    }
    
    // Initialize the game engine with the player name
    if (this.playerName) {
      this.gameEngine = new GameEngine(this.playerName);
      this.gameEngine.start();
      
      console.log(`Game started with player name: ${this.playerName}`);
    }
  }
  
  /**
   * Clean up resources
   */
  public cleanup(): void {
    if (this.gameEngine) {
      this.gameEngine.stop();
      this.gameEngine = null;
    }
  }
}

export default App;