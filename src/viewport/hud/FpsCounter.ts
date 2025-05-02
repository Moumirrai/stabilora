import Konva from 'konva';

export class FpsCounter {
    private fpsLayer: Konva.Layer;
    private hudStage: Konva.Stage; // needed for dimensions

    private fpsText: Konva.Text;
    private fpsAnimation: Konva.Animation | null = null;

    private lastFpsUpdateTime: number = 0;
    private framesSinceLastUpdate: number = 0;
    private readonly fpsUpdateInterval = 500; // ms

    constructor(fpsLayer: Konva.Layer, hudStage: Konva.Stage) {
        this.fpsLayer = fpsLayer;
        this.hudStage = hudStage;

        const initialWidth = this.hudStage.width();
        const initialHeight = this.hudStage.height();

        this.fpsText = new Konva.Text({
            text: 'FPS: --',
            fontSize: 12,
            fontFamily: 'Arial',
            fill: '#ffcc00',
            padding: 5,
            align: 'right',
            listening: false,
            perfectDrawEnabled: false,
        });
        this.updateFpsTextPosition(initialWidth, initialHeight);
        this.fpsLayer.add(this.fpsText);

        this.setupFpsCounter();
    }

    private setupFpsCounter(): void {
        this.lastFpsUpdateTime = performance.now();
        this.framesSinceLastUpdate = 0;

        this.fpsAnimation = new Konva.Animation(frame => {
            if (!frame) return;

            this.framesSinceLastUpdate++;
            const now = performance.now();
            const elapsed = now - this.lastFpsUpdateTime;

            if (elapsed > this.fpsUpdateInterval) {
                const fps = Math.round(this.framesSinceLastUpdate / (elapsed / 1000));
                this.fpsText.text('FPS: ' + fps);
                this.lastFpsUpdateTime = now;
                this.framesSinceLastUpdate = 0;
            }
        }, this.fpsLayer);

        this.fpsAnimation.start();
    }

    private updateFpsTextPosition(stageWidth: number, stageHeight: number): void {
        if (!this.fpsText) return;
        const padding = 5;
        const textHeight = this.fpsText.height();
        this.fpsText.x(padding);
        this.fpsText.y(stageHeight - textHeight - padding);
    }

    public resize(newWidth: number, newHeight: number): void {
        this.updateFpsTextPosition(newWidth, newHeight);
    }

    public start(): void {
        if (!this.fpsAnimation?.isRunning()) {
            this.fpsAnimation?.start();
        }
    }

    public stop(): void {
        this.fpsAnimation?.stop();
    }

    public destroy(): void {
        this.stop();
        this.fpsText?.destroy();
        this.fpsAnimation = null;
        // @ts-ignore
        this.fpsText = null;
        // @ts-ignore
        this.fpsLayer = null;
        // @ts-ignore
        this.hudStage = null;
    }
}