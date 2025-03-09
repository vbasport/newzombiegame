class InputSystem {
    private keys: { [key: string]: boolean } = {};
  
    constructor() {
      window.addEventListener('keydown', (e) => { this.keys[e.key] = true; });
      window.addEventListener('keyup', (e) => { this.keys[e.key] = false; });
    }
  
    public isKeyPressed(key: string): boolean {
      return this.keys[key] || false;
    }
  }
  
  export default InputSystem;