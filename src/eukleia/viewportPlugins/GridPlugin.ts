import { Viewport, Plugin } from 'pixi-viewport';
import type { FederatedEvent, FederatedPointerEvent } from 'pixi.js'; // Or FederatedWheelEvent
import { Point } from 'pixi.js'; // Import Point from pixi.js

export class GridPlugin extends Plugin {
    // You can add options or state specific to your plugin

    constructor(parent: Viewport, options: {} = {}) {
        super(parent);
        console.log("Grid initialized with parent:", parent);
        //parent.on('moved', this.test);
    }

    /* test(e: FederatedEvent<UIEvent | PixiTouch>): boolean {
        console.log(e.type)
        return false; // Allow other plugins/drag to continue
    } */

    // Called when the viewport pauses updates
    pause(): void {
        console.log("MyCustomPlugin: paused");
        super.pause(); // Good practice to call super
    }

    // Called when the viewport resumes updates
    resume(): void {
        console.log("MyCustomPlugin: resumed");
        super.resume(); // Good practice to call super
    }

    // Optional: Called when plugin is removed or viewport destroyed
    destroy(): void {
        console.log("MyCustomPlugin: destroyed");
        // Clean up any resources, listeners, etc.
    }
}