import { db } from 'src/database/DatabaseManager';
import type Viewport from '../viewport/viewport';

export class LineCommand {
  private viewportManager: Viewport;

  constructor(viewportManager: Viewport) {
    this.viewportManager = viewportManager;
  }
}
