import { db } from 'src/database/DatabaseManager';
import type ViewportManager from 'src/viewport/ViewportManager';

export class LineCommand {
  private viewportManager: ViewportManager;

  constructor(viewportManager: ViewportManager) {
    this.viewportManager = viewportManager;
  }
}
