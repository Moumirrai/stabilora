import Konva from 'konva';

class Grid {
  private layer: Konva.Layer;
  private readonly baseSize = 100;
  private readonly zoomThresholds = [0.1, 0.2, 0.5, 1, 2, 4, 8];

  constructor(layer: Konva.Layer, stage: Konva.Stage) {
    this.layer = layer;
    stage.on('wheel', () => this.drawGrid(stage));
    stage.on('dragmove', () => this.drawGrid(stage));
    this.drawGrid(stage);
  }

  private getGridSize(scale: number): number {
    const baseSize = this.baseSize;
    // Add more thresholds for smaller scales
    if (scale >= 4) return baseSize / 4;
    if (scale >= 2) return baseSize / 2;
    if (scale >= 1) return baseSize;
    if (scale >= 0.5) return baseSize * 2;
    if (scale >= 0.2) return baseSize * 4;
    if (scale >= 0.1) return baseSize * 8;
    if (scale >= 0.05) return baseSize * 16;
    if (scale >= 0.02) return baseSize * 32;
    return baseSize * 64; // For very low zoom levels
  }

  private drawGrid(stage: Konva.Stage) {
    this.layer.destroyChildren();
    
    const scale = stage.scaleX();
    const position = stage.position();
    const stageWidth = stage.width();
    const stageHeight = stage.height();
  
    if (scale < 0.05) return;
  
    const size = this.getGridSize(scale);
    
    // Calculate visible area considering the scale
    const viewLeft = (-position.x - stageWidth) / scale;
    const viewRight = (-position.x + stageWidth * 2) / scale;
    const viewTop = (-position.y - stageHeight) / scale;
    const viewBottom = (-position.y + stageHeight * 2) / scale;
    
    const startX = Math.floor(viewLeft / size) * size;
    const endX = Math.ceil(viewRight / size) * size;
    const startY = Math.floor(viewTop / size) * size;
    const endY = Math.ceil(viewBottom / size) * size;
    
    const mainLineColor = scale >= 1 ? '#999' : '#ccc';
    const subLineColor = scale >= 1 ? '#ddd' : '#eee';
    
    // Fixed line widths
    const mainLineWidth = 1;
    const subLineWidth = 0.5;
    const subdivisionWidth = 0.2;
  
    // Draw subdivision lines
    const subDivisions = 5;
    for (let x = startX; x <= endX; x += size / subDivisions) {
      if (Math.abs(x % size) > 0.1) { // Skip main grid lines
        this.layer.add(new Konva.Line({
          points: [x, startY, x, endY],
          stroke: subLineColor,
          strokeWidth: subdivisionWidth,
          opacity: 0.3,
          strokeScaleEnabled: false,
        }));
      }
    }
  
    for (let y = startY; y <= endY; y += size / subDivisions) {
      if (Math.abs(y % size) > 0.1) { // Skip main grid lines
        this.layer.add(new Konva.Line({
          points: [startX, y, endX, y],
          stroke: subLineColor,
          strokeWidth: subdivisionWidth,
          opacity: 0.3,
          strokeScaleEnabled: false,
        }));
      }
    }
  
    // Draw main grid lines
    for (let x = startX; x <= endX; x += size) {
      const isMainLine = Math.abs(x) < 0.1;
      this.layer.add(new Konva.Line({
        points: [x, startY, x, endY],
        stroke: isMainLine ? '#ff0000' : mainLineColor, // Red for Y axis
        strokeWidth: isMainLine ? mainLineWidth : subLineWidth,
        strokeScaleEnabled: false,
      }));
    }
  
    for (let y = startY; y <= endY; y += size) {
      const isMainLine = Math.abs(y) < 0.1;
      this.layer.add(new Konva.Line({
        points: [startX, y, endX, y],
        stroke: isMainLine ? '#00ff00' : mainLineColor, // Green for X axis
        strokeWidth: isMainLine ? mainLineWidth : subLineWidth,
        strokeScaleEnabled: false,
      }));
    }
  
    this.layer.batchDraw();
  }
}

export default Grid;