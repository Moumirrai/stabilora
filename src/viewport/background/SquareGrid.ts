import Konva from 'konva';

class Grid {
  private gridGroup: Konva.Group;
  private readonly baseSize = 100;
  //private readonly zoomThresholds = [0.1, 0.2, 0.5, 1, 2, 4, 8];

  constructor(layer: Konva.Layer, stage: Konva.Stage) {
    this.gridGroup = new Konva.Group({
      draggable: false,
      listening: false,
    });
    layer.add(this.gridGroup);
    stage.on('dragend', () => this.drawGrid(stage));
    stage.on('redrawAll', () => this.drawGrid(stage));
    this.drawGrid(stage);
  }

  public destroy() {
    this.gridGroup.destroyChildren();
    this.gridGroup.destroy();
    this.gridGroup.getLayer()?.off('dragend');
    this.gridGroup.getLayer()?.off('redrawAll');
  }

  private getGridSize(scale: number): number {
    const power = Math.round(-Math.log2(scale));
    return this.baseSize * Math.pow(2, power);
  }

  private drawGrid(stage: Konva.Stage) {
    console.log('Drawing grid');
    this.gridGroup.destroyChildren();

    const scale = stage.scaleX();
    const position = stage.position();
    const stageWidth = stage.width();
    const stageHeight = stage.height();

    if (scale < 0.001) return;

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

    const mainLineColor = scale >= 1 ? '#454545' : '#454545';
    const subLineColor = scale >= 1 ? '#2D2D2D' : '#2D2D2D';

    // Fixed line widths
    const mainLineWidth = 1;
    const subLineWidth = 1;
    const subdivisionWidth = 1;

    // Draw subdivision lines
    const subDivisions = 5;
    for (let x = startX; x <= endX; x += size / subDivisions) {
      if (Math.abs(x % size) > 0.1) {
        // Skip main grid lines
        this.gridGroup.add(
          new Konva.Line({
            points: [x, startY, x, endY],
            stroke: subLineColor,
            strokeWidth: subdivisionWidth,
            opacity: 0.3,
            strokeScaleEnabled: false,
          })
        );
      }
    }

    for (let y = startY; y <= endY; y += size / subDivisions) {
      if (Math.abs(y % size) > 0.1) {
        // Skip main grid lines
        this.gridGroup.add(
          new Konva.Line({
            points: [startX, y, endX, y],
            stroke: subLineColor,
            strokeWidth: subdivisionWidth,
            opacity: 0.3,
            strokeScaleEnabled: false,
          })
        );
      }
    }

    // Draw main grid lines
    for (let x = startX; x <= endX; x += size) {
      const isMainLine = Math.abs(x) == 0;
      this.gridGroup.add(
        new Konva.Line({
          points: [x, startY, x, endY],
          stroke: isMainLine ? '#ff0000' : mainLineColor, // Red for Y axis
          strokeWidth: isMainLine ? mainLineWidth : subLineWidth,
          strokeScaleEnabled: false,
        })
      );
    }

    for (let y = startY; y <= endY; y += size) {
      const isMainLine = Math.abs(y) == 0;
      this.gridGroup.add(
        new Konva.Line({
          points: [startX, y, endX, y],
          stroke: isMainLine ? '#00ff00' : mainLineColor, // Green for X axis
          strokeWidth: isMainLine ? mainLineWidth : subLineWidth,
          strokeScaleEnabled: false,
        })
      );
    }

    this.gridGroup.getLayer()?.batchDraw();
  }
}

export default Grid;
