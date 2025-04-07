// services/SnapService.ts
import { SnapManager } from '../SnapManager';

export class SnapService {
  private static instance: SnapService;
  private snapManager: SnapManager;

  private constructor() {
    this.snapManager = new SnapManager({
      enabled: false,
      endPointSnapDistance: 15,
      gridSize: 50,
    });
  }

  public static getInstance(): SnapService {
    if (!SnapService.instance) {
      SnapService.instance = new SnapService();
    }
    return SnapService.instance;
  }

  public getSnapManager(): SnapManager {
    return this.snapManager;
  }
}
