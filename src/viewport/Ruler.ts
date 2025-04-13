import Konva from 'konva';

class Ruler {
    private tickGroup: Konva.Group;
    private rulerGroup: Konva.Group;
    private layer: Konva.Layer;
    private stage: Konva.Stage;
    private rulerBackground: Konva.Rect | null = null;
    private margin: number = 200;

    constructor(layer: Konva.Layer, stage: Konva.Stage) {
        this.rulerGroup = new Konva.Group();
        this.tickGroup = new Konva.Group({ name: 'tickGroup' });
        this.layer = layer;
        this.stage = stage;
        this.initRuler();
    }

    private initRuler() {
        // background rectangle
        const rect = new Konva.Rect({
            x: 0,
            y: 0,
            width: 20,
            height: this.stage.height(),
            fill: "rgba(0, 0, 0, 0.3)",
            cornerRadius: [0, 5, 5, 0],
            shadowColor: 'black',
            shadowBlur: 4,
            shadowOffset: { x: 2, y: 2 },
            shadowOpacity: 0.3,
            name: 'rulerBackground'
        });

        this.rulerBackground = rect;

        this.rulerGroup.add(rect);
        this.rulerGroup.add(this.tickGroup);
        this.layer.add(this.rulerGroup);

        // setup event handlers
        this.stage.on('dragmove', () => this.updateRulerValues());
        this.stage.on('dragend', () => this.updateRulerValues());
        this.stage.on('redraw', () => this.updateRulerValues());
        this.stage.on('redrawAll', () => this.updateRulerValues());
        this.stage.on('mousemove', () => this.updateRulerValues());

        // initial update
        this.updateRulerValues();
    }

    public setVisible(visible: boolean) {
        this.rulerGroup.visible(visible);
        this.layer.batchDraw();
    }

    public destroy() {
        this.rulerGroup.destroy();
        this.layer.batchDraw();
    }

    public updateRulerValues() {


        const scale = this.stage.scaleX();
        const position = this.stage.position();
        const stageHeight = this.stage.height();

        this.rulerBackground?.setAttrs({
            height: stageHeight,
        });

        // visible range in world coordinates
        const viewTop = -position.y / scale;
        const viewBottom = (stageHeight - position.y) / scale;

        // clear existing tick marks
        this.tickGroup.destroyChildren();

        // get tick interval based on zoom level
        const mainTickInterval = this.getTickInterval(scale);
        const halfTickInterval = mainTickInterval / 2;
        const tenthTickInterval = mainTickInterval / 10;

        // calculate tick positions for main ticks
        const startY = Math.floor(viewTop / mainTickInterval) * mainTickInterval;
        const endY = Math.ceil(viewBottom / mainTickInterval) * mainTickInterval;

        // draw main ticks and labels
        for (let y = startY; y <= endY; y += mainTickInterval) {
            // convert world to screen coordinate
            const screenY = position.y + y * scale;

            // Skip if out of view
            if (screenY + this.margin < 0 || screenY - this.margin > stageHeight) continue;

            // Create main tick mark
            const tick = new Konva.Line({
                points: [0, screenY, 20, screenY],
                stroke: 'white',
                strokeWidth: 1.5
            });

            // Create label
            const label = new Konva.Text({
                x: 12,
                y: screenY - 8,
                text: this.formatCoordinate(y),
                fontSize: 11,
                fontFamily: 'monospace',
                fill: 'white',
                rotation: -90
            });

            this.tickGroup.add(tick);
            this.tickGroup.add(label);

            // Add half ticks between main ticks
            if (y + halfTickInterval <= endY) {
                const halfY = y + halfTickInterval;
                const halfScreenY = position.y + halfY * scale;

                if (halfScreenY >= 0 && halfScreenY <= stageHeight) {
                    // Create medium tick mark (shorter than main tick)
                    const halfTick = new Konva.Line({
                        points: [10, halfScreenY, 20, halfScreenY],
                        stroke: 'white',
                        strokeWidth: 1
                    });
                    this.tickGroup.add(halfTick);
                }
            }

            // Add tenth ticks
            for (let i = 1; i < 10; i++) {
                // Skip the halfway point (i=5) as we already added a half tick there
                if (i === 5) continue;

                const tenthY = y + i * tenthTickInterval;
                const tenthScreenY = position.y + tenthY * scale;

                if (tenthScreenY >= 0 && tenthScreenY <= stageHeight) {
                    // Create small tick mark (shorter than half tick)
                    const tenthTick = new Konva.Line({
                        points: [14, tenthScreenY, 20, tenthScreenY],
                        stroke: 'white',
                        strokeWidth: 0.5,
                        opacity: 0.7
                    });
                    this.tickGroup.add(tenthTick);
                }
            }
        }

        this.layer.batchDraw();
    }

    private getTickInterval(scale: number): number {
        const power = Math.round(-Math.log2(scale));
        const baseTickSize = 200;
        return baseTickSize * Math.pow(2, power);
    }

    private formatCoordinate(value: number): string {
        if (value === 0) return "0";

        const absValue = Math.abs(value);

        // For extremely small values - use scientific notation
        if (absValue < 0.0001) {
            return value.toExponential(2);
        }
        // For very small values
        else if (absValue < 0.01) {
            return value.toFixed(4);
        }
        // For small values
        else if (absValue < 0.1) {
            return value.toFixed(3);
        }
        // For values less than 1
        else if (absValue < 1) {
            return value.toFixed(2);
        }
        // For values less than 10
        else if (absValue < 10) {
            return value.toFixed(1);
        }

        // For larger integers, round to whole number
        return Math.round(value).toString();
    }
}

export default Ruler;