import Konva from 'konva';

class DotGrid {
  private gridGroup: Konva.Group;
  private stage: Konva.Stage;
  private readonly baseSize = 100;
  private readonly mainDotSize = 2; // Fixed pixel size
  private readonly subDotSize = 1; // Fixed pixel size
  private readonly axisLineWidth = 1; // Fixed pixel size for axis lines

  constructor(layer: Konva.Layer, stage: Konva.Stage) {
    this.stage = stage;
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
    this.stage.off('dragend');
    this.stage.off('redrawAll');
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

    // Create a custom shape for better performance
    const dotsShape = new Konva.Shape({
      sceneFunc: (context, _) => {
        // Set constant pixel sizes and adjust for scale
        const mainDotRadius = this.mainDotSize / scale;
        const originDotRadius = (this.mainDotSize * 2) / scale;

        // Main grid dots
        const mainDotColor = '#454545';
        const originDotColor = '#ffcc00';
        const axisColor = '#666666';

        // Draw main axes
        const axisWidth = this.axisLineWidth / scale;
        context.lineWidth = axisWidth;
        context.strokeStyle = axisColor;
        context.globalAlpha = 0.7;
        
        // X-axis (horizontal line)
        if (viewTop <= 0 && viewBottom >= 0) {
          context.beginPath();
          context.moveTo(startX, 0);
          context.lineTo(endX, 0);
          context.stroke();
        }
        
        // Y-axis (vertical line)
        if (viewLeft <= 0 && viewRight >= 0) {
          context.beginPath();
          context.moveTo(0, startY);
          context.lineTo(0, endY);
          context.stroke();
        }

        // Draw main grid dots
        for (let x = startX; x <= endX; x += size) {
          for (let y = startY; y <= endY; y += size) {
            const isOrigin = Math.abs(x) == 0 && Math.abs(y) == 0

            if (isOrigin) {
              // Origin point
              context.fillStyle = originDotColor;
              context.beginPath();
              context.arc(x, y, originDotRadius, 0, Math.PI * 2);
              context.fill();
            } else {
              // Regular grid points
              context.fillStyle = mainDotColor;
              context.beginPath();
              context.arc(x, y, mainDotRadius, 0, Math.PI * 2);
              context.fill();
            }
          }
        }
        
        context.globalAlpha = 0.3;

        // Only draw subdivisions when zoomed in enough
        if (scale > 0.05) {
          const subDivisions = 5;
          const subDotColor = '#2D2D2D';
          const subDotRadius = this.subDotSize / scale;

          context.fillStyle = subDotColor;

          // Only create subdivision dots when we won't be rendering too many
          const totalWidth = endX - startX;
          const totalHeight = endY - startY;
          const estimatedDots = (totalWidth / (size / subDivisions)) * (totalHeight / (size / subDivisions));

          if (estimatedDots < 10000) {
            for (let x = startX; x <= endX; x += size / subDivisions) {
              for (let y = startY; y <= endY; y += size / subDivisions) {
                // Skip main grid points
                if (Math.abs(x % size) > 0.1 || Math.abs(y % size) > 0.1) {
                  context.beginPath();
                  context.arc(x, y, subDotRadius, 0, Math.PI * 2);
                  context.fill();
                }
              }
            }
          }

          context.globalAlpha = 1;
        }
      },
      listening: false,
    });

    this.gridGroup.add(dotsShape);
    this.gridGroup.getLayer()?.batchDraw();
  }
}

export default DotGrid;