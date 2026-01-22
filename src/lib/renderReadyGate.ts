/**
 * RenderReadyGate
 * Singleton that tracks render readiness for reliable export capture
 */

export interface RenderReadyState {
  geometryLoaded: boolean;
  textureLoaded: boolean;
  framesRendered: number;
  isReady: boolean;
}

type ReadyListener = () => void;

class RenderReadyGate {
  private state: RenderReadyState = {
    geometryLoaded: false,
    textureLoaded: true, // Default true if no texture needed
    framesRendered: 0,
    isReady: false,
  };
  
  private listeners: Set<ReadyListener> = new Set();
  private requiredFrames = 3;
  
  /**
   * Reset the gate for a new render session
   */
  reset(): void {
    this.state = {
      geometryLoaded: false,
      textureLoaded: true,
      framesRendered: 0,
      isReady: false,
    };
  }
  
  /**
   * Mark that geometry has been created and added to scene
   */
  markGeometryReady(): void {
    this.state.geometryLoaded = true;
    this.checkReady();
  }
  
  /**
   * Mark that texture overlay is loading
   */
  markTextureLoading(): void {
    this.state.textureLoaded = false;
  }
  
  /**
   * Mark that texture overlay has loaded
   */
  markTextureReady(): void {
    this.state.textureLoaded = true;
    this.checkReady();
  }
  
  /**
   * Increment frame counter (call in useFrame)
   */
  incrementFrame(): void {
    this.state.framesRendered++;
    if (this.state.framesRendered >= this.requiredFrames) {
      this.checkReady();
    }
  }
  
  /**
   * Check if all conditions are met
   */
  private checkReady(): void {
    const wasReady = this.state.isReady;
    this.state.isReady = 
      this.state.geometryLoaded && 
      this.state.textureLoaded && 
      this.state.framesRendered >= this.requiredFrames;
    
    if (!wasReady && this.state.isReady) {
      this.notifyListeners();
    }
  }
  
  /**
   * Notify all listeners that render is ready
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }
  
  /**
   * Get current ready state
   */
  get isReady(): boolean {
    return this.state.isReady;
  }
  
  /**
   * Get full state for debugging
   */
  getState(): RenderReadyState {
    return { ...this.state };
  }
  
  /**
   * Wait for render to be ready (with timeout)
   */
  waitForReady(timeoutMs: number = 5000): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.state.isReady) {
        resolve(true);
        return;
      }
      
      const listener = () => {
        this.listeners.delete(listener);
        clearTimeout(timeout);
        resolve(true);
      };
      
      const timeout = setTimeout(() => {
        this.listeners.delete(listener);
        resolve(false);
      }, timeoutMs);
      
      this.listeners.add(listener);
    });
  }
}

// Singleton instance
export const renderGate = new RenderReadyGate();
