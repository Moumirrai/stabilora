import Konva from 'konva';
// Remove IRect if not used elsewhere
// import type { IRect } from 'konva/lib/types';
import ViewportManager from '../viewport/ViewportManager';

interface RulerSegmentParams {
    scale: number;
    tickInterval: number;
    majorTickIntervalScreen: number;
    rulerThickness: number;
    isVertical: boolean;
    strokeColor: string;
    strokeWidth: number;
}


class HudManager {
    private hudStage: Konva.Stage;
    private hudLayer: Konva.Layer;
    private viewportManager: ViewportManager;
    private mainStage: Konva.Stage | null;
    private resizeObserver: ResizeObserver | null = null;
    private hudContainer: HTMLDivElement;

    private horizontalSegmentShape: Konva.Shape | null = null;
    private verticalSegmentShape: Konva.Shape | null = null;

    private readonly mainStageEventNs = '.hudManagerUpdate';
    private readonly rulerThickness = 20; // Visual thickness of the ruler bands
    private readonly cacheBufferFactor = 2; // Buffer for caching

    private horizontalRulerGroup: Konva.Group;
    private verticalRulerGroup: Konva.Group;
    private fpsText: Konva.Text;
    private fpsAnimation: Konva.Animation | null = null;

    // State captured during the last full redraw
    private lastDrawMainStagePos: { x: number; y: number } | null = null;
    private lastDrawScale: number | null = null;

    // FPS calculation state
    private lastFpsUpdateTime: number = 0;
    private framesSinceLastUpdate: number = 0;
    private readonly fpsUpdateInterval = 500;

    constructor(hudContainerElement: HTMLDivElement, viewportManagerInstance: ViewportManager) {
        this.hudContainer = hudContainerElement;
        this.viewportManager = viewportManagerInstance;
        this.mainStage = this.viewportManager.getStage();

        if (!this.mainStage) {
            throw new Error("HudManager requires a ViewportManager with an initialized stage.");
        }

        const initialWidth = this.hudContainer.clientWidth;
        const initialHeight = this.hudContainer.clientHeight;

        this.hudStage = new Konva.Stage({
            container: this.hudContainer,
            width: initialWidth,
            height: initialHeight,
            listening: false,
        });

        this.hudLayer = new Konva.Layer();
        this.hudStage.add(this.hudLayer);

        this.horizontalRulerGroup = new Konva.Group({ x: 0, y: 0, name: 'horizontalRuler' });
        this.verticalRulerGroup = new Konva.Group({ x: 0, y: 0, name: 'verticalRuler' });
        this.hudLayer.add(this.horizontalRulerGroup, this.verticalRulerGroup);

        this.fpsText = new Konva.Text({
            text: 'FPS: --',
            fontSize: 12,
            fontFamily: 'Arial',
            fill: '#ffcc00',
            padding: 5,
            align: 'right',
        });
        this.updateFpsTextPosition(initialWidth, initialHeight);
        this.hudLayer.add(this.fpsText);

        this.setupResizeHandling(this.hudContainer);
        this.setupMainStageListeners();
        this.setupFpsCounter();

        // Perform initial draw after setup
        this.redrawRulerGraphics(); // Ensure an initial draw happens
    }

    private setupResizeHandling(container: HTMLDivElement): void {
        this.resizeObserver = new ResizeObserver(() => {
            this.handleResize(container);
        });
        this.resizeObserver.observe(container);
    }

    private getOrCreateRulerSegmentShape(params: RulerSegmentParams): Konva.Shape {
        const cacheKey = `${params.isVertical ? 'v' : 'h'}-${params.scale.toFixed(4)}-${params.tickInterval.toFixed(4)}`; // Simple cache key based on critical params
        let segmentShape = params.isVertical ? this.verticalSegmentShape : this.horizontalSegmentShape;

        // Invalidate cache if scale/interval changed significantly (adjust threshold as needed)
        // A more robust cache would compare params object, but this is simpler
        if (segmentShape && segmentShape.attrs.cacheKey !== cacheKey) {
            segmentShape.destroy(); // Destroy old cached shape
            segmentShape = null;
            if (params.isVertical) this.verticalSegmentShape = null;
            else this.horizontalSegmentShape = null;
        }


        if (!segmentShape) {
            segmentShape = new Konva.Shape({
                sceneFunc: (context, shape) => {
                    this.drawRulerSegment(context, shape, params);
                },
                width: params.isVertical ? params.rulerThickness : params.majorTickIntervalScreen,
                height: params.isVertical ? params.majorTickIntervalScreen : params.rulerThickness,
                perfectDrawEnabled: false, // Optimization
                listening: false,
                fill: '#f0f0f0', // Optional background for the segment
                stroke: params.strokeColor, // Optional border for the segment
                strokeWidth: 0.5,
                // Store params used to create this for cache validation
                cacheKey: cacheKey
            });

            // Cache the segment shape itself for reuse
            segmentShape.cache();

            if (params.isVertical) {
                this.verticalSegmentShape = segmentShape;
            } else {
                this.horizontalSegmentShape = segmentShape;
            }
        } else {
            // console.log(`Reusing cached ${params.isVertical ? 'vertical' : 'horizontal'} segment shape`);
        }

        return segmentShape;
    }

    private drawRulerSegment(context: Konva.Context, shape: Konva.Shape, params: RulerSegmentParams): void {
        const { scale, tickInterval, majorTickIntervalScreen, rulerThickness, isVertical, strokeColor, strokeWidth } = params;
        const minorTickIntervalScreen = tickInterval * scale;

        context.beginPath();
        context.setAttr('strokeStyle', strokeColor);
        context.setAttr('lineWidth', strokeWidth);

        const numMinorTicks = 5; // Typically 5 ticks per major interval

        for (let i = 0; i <= numMinorTicks; i++) { // Draw ticks including start/end
            const isMajor = i === 0 || i === numMinorTicks; // Treat segment boundaries as major for drawing
            const tickLength = isMajor ? (isVertical ? rulerThickness : rulerThickness) * 0.5 : (isVertical ? rulerThickness : rulerThickness) * 0.25; // Adjust tick lengths
            const currentPos = i * minorTickIntervalScreen;

            if (isVertical) {
                // Draw vertical ticks (horizontal lines)
                const x1 = rulerThickness - tickLength;
                const x2 = rulerThickness;
                const y = currentPos;
                context.moveTo(x1, y);
                context.lineTo(x2, y);
            } else {
                // Draw horizontal ticks (vertical lines)
                const x = currentPos;
                const y1 = rulerThickness - tickLength;
                const y2 = rulerThickness;
                context.moveTo(x, y1);
                context.lineTo(x, y2);
            }
        }

        context.stroke();
        context.fillStrokeShape(shape); // Fill background and stroke ticks
    }

    private handleResize(container: HTMLDivElement): void {
        const newWidth = container.clientWidth;
        const newHeight = container.clientHeight;
        this.hudStage.width(newWidth);
        this.hudStage.height(newHeight);
        this.updateFpsTextPosition(newWidth, newHeight);
        this.redrawRulerGraphics(); // Full redraw needed on resize
    }

    private updateFpsTextPosition(stageWidth: number, stageHeight: number): void {
        if (!this.fpsText) return;
        const padding = 10;
        // Use Konva's method to get accurate width
        const textWidth = this.fpsText.getTextWidth();
        this.fpsText.x(stageWidth - textWidth - padding);
        this.fpsText.y(stageHeight - this.fpsText.height() - padding);
    }

    // *** MODIFIED Event Listeners ***
    private setupMainStageListeners(): void {
        if (!this.mainStage) return;

        // --- Redraw Events ---
        // Redraw completely ONLY after dragging ends, resize, explicit request, or zoom ends
        const redrawEvents = `dragend${this.mainStageEventNs} redrawAll${this.mainStageEventNs} zoomend${this.mainStageEventNs}`; // Added zoomend
        this.mainStage.on(redrawEvents, () => {
            this.redrawRulerGraphics();
        });

        // --- Shift on Drag ---
        // Only shift existing graphics during drag/pan
        this.mainStage.on(`dragmove${this.mainStageEventNs}`, () => {
            this.shiftRulerGraphics();
        });

        // --- Transform on Zoom ---
        // Apply scale/translate transformation during continuous zoom
        this.mainStage.on(`zoomed${this.mainStageEventNs}`, () => { // Changed from redraw to transform
            this.transformRulerGraphicsOnZoom();
        });
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
                this.updateFpsTextPosition(this.hudStage.width(), this.hudStage.height());
                this.lastFpsUpdateTime = now;
                this.framesSinceLastUpdate = 0;
            }
        }, this.hudLayer);

        this.fpsAnimation.start();
    }

    /**
     * Shifts the cached ruler groups based on the main stage's movement
     * since the last full redraw. Called frequently during panning.
     */
    private shiftRulerGraphics(): void {
        if (!this.mainStage || !this.lastDrawMainStagePos) {
            return;
        }

        const currentMainStagePos = this.mainStage.position();
        const deltaX = currentMainStagePos.x - this.lastDrawMainStagePos.x;
        const deltaY = currentMainStagePos.y - this.lastDrawMainStagePos.y;

        // Apply only translation delta
        this.horizontalRulerGroup.x(deltaX);
        this.verticalRulerGroup.y(deltaY);

        // Keep scale as it was after the last redraw (or zoom transform)
        // We don't reset scale here because shift only handles translation

        this.hudLayer.batchDraw();
    }

    // *** NEW Method for Zoom Transformation ***
    /**
     * Transforms (scales and shifts) the cached ruler groups based on the main stage's
     * scale and movement since the last full redraw. Called frequently during zooming.
     */
    private transformRulerGraphicsOnZoom(): void {
        if (!this.mainStage || this.lastDrawScale === null || this.lastDrawMainStagePos === null) {
            // Cannot transform if rulers haven't been drawn yet or state is missing
            // A redraw might be needed, but let's avoid it during the zoom event itself
            // The 'zoomend' event should handle the final redraw.
            console.warn("Cannot transform rulers: Initial draw state missing.");
            return;
        }

        const currentScale = this.mainStage.scaleX();
        const currentMainStagePos = this.mainStage.position();

        // Prevent division by zero or transformation if scale is invalid
        if (this.lastDrawScale <= 0 || currentScale <= 0) {
            console.error("Cannot transform rulers with invalid scale.");
            return;
        }

        const scaleFactor = currentScale / this.lastDrawScale;

        // Calculate the required offset for the groups based on scale and position change
        // The origin for scaling should be the point that stays fixed during zoom (often the pointer position, but here we use the stage origin's screen position change)
        // Position adjustment: currentPos = lastDrawPos * scaleFactor + translationDelta
        // translationDelta = currentPos - lastDrawPos * scaleFactor
        const newX = currentMainStagePos.x - this.lastDrawMainStagePos.x * scaleFactor;
        const newY = currentMainStagePos.y - this.lastDrawMainStagePos.y * scaleFactor;

        // Apply scale relative to the last *redraw* scale
        this.horizontalRulerGroup.scaleX(scaleFactor);
        this.verticalRulerGroup.scaleY(scaleFactor); // Assuming uniform scaling

        // Apply translation
        this.horizontalRulerGroup.x(newX);
        this.verticalRulerGroup.y(newY);

        this.hudLayer.batchDraw();
    }


    /**
     * Clears and completely redraws the ruler ticks and labels based on the
     * current viewport state. Called less frequently (zoom end, drag end, resize).
     */
    public redrawRulerGraphics(): void {
        if (!this.mainStage) {
            console.error("Cannot redraw rulers: Main stage not available.");
            return;
        }

        const scale = this.mainStage.scaleX();
        const currentMainStagePos = this.mainStage.position();
        const hudWidth = this.hudStage.width();
        const hudHeight = this.hudStage.height();

        if (scale <= 0 || !Number.isFinite(scale) || hudWidth <= 0 || hudHeight <= 0) {
            console.warn("Cannot redraw rulers with invalid scale or dimensions:", scale, hudWidth, hudHeight);
            return;
        }

        // --- Clear existing graphics and reset state ---
        this.horizontalRulerGroup.destroyChildren();
        this.verticalRulerGroup.destroyChildren();
        // No need to clear group cache if we destroy children? Let's keep it for safety.
        this.horizontalRulerGroup.clearCache();
        this.verticalRulerGroup.clearCache();

        this.horizontalRulerGroup.position({ x: 0, y: 0 }).scale({ x: 1, y: 1 });
        this.verticalRulerGroup.position({ x: 0, y: 0 }).scale({ x: 1, y: 1 });

        // --- Calculate tick properties ---
        const tickInterval = this.calculateTickInterval(scale);
        const precision = this.getPrecision(tickInterval);
        const majorTickIntervalWorld = 5 * tickInterval;
        const majorTickIntervalScreen = majorTickIntervalWorld * scale;

        // Prevent excessive drawing if interval is too small on screen
        if (majorTickIntervalScreen < 5) {
            console.warn("Major tick interval too small on screen, skipping redraw:", majorTickIntervalScreen);
            return;
        }
        const commonParams = {
            scale: scale,
            tickInterval: tickInterval,
            majorTickIntervalScreen: majorTickIntervalScreen,
            rulerThickness: this.rulerThickness,
            strokeColor: 'grey',
            strokeWidth: 1,
        };
        const horizontalParams: RulerSegmentParams = { ...commonParams, isVertical: false };
        const verticalParams: RulerSegmentParams = { ...commonParams, isVertical: true };

        // --- Get Cached Segment Shapes ---
        // Ensure shapes are created/retrieved before the loop if needed outside
        const horizontalSegmentProto = this.getOrCreateRulerSegmentShape(horizontalParams);
        const verticalSegmentProto = this.getOrCreateRulerSegmentShape(verticalParams);


        // --- Determine World Coordinate Range for Tiling ---
        // Calculate the world coordinates visible in the buffered HUD area
        const bufferX = this.cacheBufferFactor * hudWidth;
        const bufferY = this.cacheBufferFactor * hudHeight;
        const viewMinWorldX = (-bufferX - currentMainStagePos.x) / scale;
        const viewMaxWorldX = (hudWidth + bufferX - currentMainStagePos.x) / scale;
        const viewMinWorldY = (-bufferY - currentMainStagePos.y) / scale;
        const viewMaxWorldY = (hudHeight + bufferY - currentMainStagePos.y) / scale;

        // Align start/end to major tick intervals
        const startMajorWorldX = Math.floor(viewMinWorldX / majorTickIntervalWorld) * majorTickIntervalWorld;
        const endMajorWorldX = Math.ceil(viewMaxWorldX / majorTickIntervalWorld) * majorTickIntervalWorld;
        const startMajorWorldY = Math.floor(viewMinWorldY / majorTickIntervalWorld) * majorTickIntervalWorld;
        const endMajorWorldY = Math.ceil(viewMaxWorldY / majorTickIntervalWorld) * majorTickIntervalWorld;


        // --- Tile Horizontal Ruler ---
        for (let worldX = startMajorWorldX; worldX < endMajorWorldX; worldX += majorTickIntervalWorld) {
            const screenX = worldX * scale + currentMainStagePos.x;

            // Clone the cached segment shape
            const segmentInstance = horizontalSegmentProto.clone();
            segmentInstance.position({ x: screenX, y: 0 });
            this.horizontalRulerGroup.add(segmentInstance);

            // Add Major Tick Label (at the start of the segment)
            this.horizontalRulerGroup.add(new Konva.Text({
                x: screenX + 2, y: 5,
                text: worldX.toFixed(precision),
                fontSize: 10, fill: 'grey', listening: false,
                perfectDrawEnabled: false // Optimization
            }));
        }

        for (let worldY = startMajorWorldY; worldY < endMajorWorldY; worldY += majorTickIntervalWorld) {
            const screenY = worldY * scale + currentMainStagePos.y;

            // Clone the cached segment shape
            const segmentInstance = verticalSegmentProto.clone();
            segmentInstance.position({ x: 0, y: screenY });
            this.verticalRulerGroup.add(segmentInstance);

            // Add Major Tick Label (at the start of the segment)
            this.verticalRulerGroup.add(new Konva.Text({
                x: 5, y: screenY + 2, // Position relative to the segment start
                text: worldY.toFixed(precision),
                fontSize: 10, fill: 'grey', listening: false,
                rotation: -90, // Rotate text
                perfectDrawEnabled: false // Optimization
            }));
        }


        // --- Cache the entire groups containing the tiled segments ---
        // Cache region slightly larger than the stage
        const cacheWidth = hudWidth + bufferX * 2;
        const cacheHeight = hudHeight + bufferY * 2;
        this.horizontalRulerGroup.cache({
            x: -bufferX, y: 0,
            width: cacheWidth, height: this.rulerThickness
        });
        this.verticalRulerGroup.cache({
            x: 0, y: -bufferY,
            width: this.rulerThickness, height: cacheHeight
        });

        // --- Store state for subsequent shifts/transforms ---
        this.lastDrawMainStagePos = { ...currentMainStagePos };
        this.lastDrawScale = scale;

        this.hudLayer.batchDraw();
    }


    // --- Helper Methods ---

    private calculateTickInterval(scale: number): number {
        // ... (Keep your existing calculateTickInterval implementation) ...
        const minPixelSpacingMajor = 50; // Target minimum pixels between major ticks (e.g., every 5th tick)
        const minPixelSpacingAny = 8;   // Absolute minimum pixels between any two ticks

        // Target world units for *each* tick based on major tick spacing
        const targetWorldUnitsPerTick = (minPixelSpacingMajor / 5) / scale;

        // Define potential interval steps (adjust as needed for your domain)
        const intervals = [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10, 25, 50, 100, 250, 500, 1000, 5000, 10000];

        // Find the smallest interval that is >= the target
        let bestInterval = intervals[intervals.length - 1]; // Default to largest
        for (const interval of intervals) {
            if (targetWorldUnitsPerTick <= interval) {
                bestInterval = interval;
                break;
            }
        }

        // Ensure the chosen interval doesn't result in ticks being too close together visually
        let currentIndex = intervals.indexOf(bestInterval);
        while ((bestInterval * scale) < minPixelSpacingAny && currentIndex < intervals.length - 1) {
            currentIndex++;
            bestInterval = intervals[currentIndex];
        }

        return bestInterval;
    }

    private getPrecision(interval: number): number {
        // ... (Keep your existing getPrecision implementation) ...
        if (!Number.isFinite(interval) || interval === 0) return 0;
        const s = interval.toString();
        const dotIndex = s.indexOf('.');
        if (dotIndex >= 0) {
            // Handle potential scientific notation (e.g., 1e-7)
            const eIndex = s.toLowerCase().indexOf('e');
            if (eIndex > 0) {
                const exponent = parseInt(s.slice(eIndex + 1), 10);
                // Precision is number of digits after dot minus the exponent
                const fractionalPart = s.slice(dotIndex + 1, eIndex);
                return Math.max(0, fractionalPart.length - exponent);
            } else {
                // Standard decimal notation
                return s.length - dotIndex - 1;
            }
        }
        return 0; // No decimal part
    }

    // --- Public Accessors and Cleanup ---

    public getHudStage(): Konva.Stage {
        return this.hudStage;
    }

    public getHudLayer(): Konva.Layer {
        return this.hudLayer;
    }

    public destroy(): void {
        if (this.mainStage) {
            this.mainStage.off(this.mainStageEventNs);
        }
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
        /* if (this.fpsAnimation) {
            this.fpsAnimation.stop();
            this.fpsAnimation = null;
        }
        this.hudStage.destroy(); */
    }
}

export default HudManager;