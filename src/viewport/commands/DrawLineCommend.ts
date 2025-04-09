//import { Command } from './Command';
//import { SceneManager } from '../SceneManager';
//import { LineObject } from '../objects/LineObject';

/* export class DrawLineCommand implements Command {
  private sceneManager: SceneManager;
  private startX: number;
  private startY: number;
  private endX: number;
  private endY: number;
  private objectId: string | null = null;
  
  constructor(sceneManager: SceneManager, startX: number, startY: number, endX: number, endY: number) {
    this.sceneManager = sceneManager;
    this.startX = startX;
    this.startY = startY;
    this.endX = endX;
    this.endY = endY;
  }
  
  execute(): void {
    const lineObject = new LineObject({
      startX: this.startX,
      startY: this.startY,
      endX: this.endX,
      endY: this.endY
    });
    
    this.objectId = this.sceneManager.addObject(lineObject);
  }
  
  undo(): void {
    if (this.objectId) {
      this.sceneManager.removeObject(this.objectId);
    }
  }
  
  getName(): string {
    return "Draw Line";
  }
} */