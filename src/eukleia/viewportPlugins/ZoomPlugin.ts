import { Viewport, Plugin } from 'pixi-viewport';
import type { FederatedPointerEvent } from 'pixi.js';
import { Point } from 'pixi.js';

export class MyCustomPlugin extends Plugin {
    private someOption: boolean;
    private lastMiddleClickTime: number = 0;
    private doubleClickDelay: number = 300;

    constructor(parent: Viewport, options: { someOption?: boolean, doubleClickDelay?: number } = {}) {
        super(parent);
        this.someOption = options.someOption ?? false;
        this.doubleClickDelay = options.doubleClickDelay ?? 300;
        console.log("MyCustomPlugin initialized with parent:", parent);
    }

    // Called when the mouse button goes down or touch starts within the viewport
    down(event: FederatedPointerEvent): boolean {
        if (event.button === 1) {
            const currentTime = Date.now();
            const timeSinceLastClick = currentTime - this.lastMiddleClickTime;

            if (timeSinceLastClick < this.doubleClickDelay) {
                console.log("Middle mouse button double-click detected!", event);
                this.parent.animate({
                        time: 300,
                        position: new Point(400,100),
                        width: 1000,
                        ease: "easeInOutSine",
                        removeOnInterrupt: true,
                    })

                this.lastMiddleClickTime = 0;
                return true; // Stop propagation
            }

            this.lastMiddleClickTime = currentTime;
        }
        return false; // Allow other plugins/drag to continue
    }



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