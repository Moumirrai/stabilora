import type { HitResult } from '../spatial/hitTest';
import type { Scene } from './Scene';
import type {
  ViewportEngine,
  ViewportPointerEvent,
} from '../viewport/ViewportEngine';
import { EventEmitter } from '../utils/EventEmitter';
import type { ToolDragEvent, ToolPointerEvent } from '../tools/Tool';

const HIT_TOLERANCE_PX = 10;
const PRESS_THRESHOLD_PX = 2; // below: click, above: drag
const CLICK_MAX_MS = 500;

type Press = {
  button: number;
  screen: { x: number; y: number };
  world: { x: number; y: number };
  time: number;
  dragging: boolean;
  hit: HitResult | undefined;
};

export class InteractionController {
  private scene: Scene;
  private viewport: ViewportEngine;
  private unsubPointer: () => void;
  private press: Press | null = null;

  readonly onPointerMove = new EventEmitter<ToolPointerEvent>();
  readonly onPointerLeave = new EventEmitter<ViewportPointerEvent>();
  readonly onLeftDown = new EventEmitter<ToolPointerEvent>();
  readonly onLeftUp = new EventEmitter<ToolPointerEvent>();
  readonly onLeftClick = new EventEmitter<ToolPointerEvent>();
  readonly onRightDown = new EventEmitter<ToolPointerEvent>();
  readonly onRightUp = new EventEmitter<ToolPointerEvent>();
  readonly onRightClick = new EventEmitter<ToolPointerEvent>();
  readonly onMiddleDoubleClick = new EventEmitter<ViewportPointerEvent>();
  readonly onDragStart = new EventEmitter<ToolDragEvent>();
  readonly onDragMove = new EventEmitter<ToolDragEvent>();
  readonly onDragEnd = new EventEmitter<ToolDragEvent>();
  readonly onPointerCancel = new EventEmitter<ViewportPointerEvent>();

  constructor(scene: Scene, viewport: ViewportEngine) {
    this.scene = scene;
    this.viewport = viewport;
    this.unsubPointer = viewport.onPointerEvent.subscribe(this.handlePointer);
  }

  destroy(): void {
    this.press = null;
    this.unsubPointer();
  }

  private handlePointer = (e: ViewportPointerEvent): void => {
    if (e.type === 'pointercancel') {
      this.press = null;
      this.onPointerCancel.emit(e);
      return;
    }
    if (e.type === 'pointerleave') {
      this.onPointerLeave.emit(e);
      return;
    }

    switch (e.type) {
      case 'pointermove':
        this.handleMove(e);
        break;
      case 'pointerdown':
        this.handleDown(e);
        break;
      case 'pointerup':
        this.handleUp(e);
        break;
    }
  };

  private handleDown(e: ViewportPointerEvent): void {
    if (e.button === 1) {
      // middle is canvas-only (pan/fit), never a tool gesture
      if (e.doubleClick) this.onMiddleDoubleClick.emit(e);
      return;
    }
    if (this.press?.button === e.button) return; // duplicate down
    const hit = this.hitTest(e);
    this.press = {
      button: e.button,
      screen: { ...e.screen },
      world: { ...e.world },
      time: performance.now(),
      dragging: false,
      hit,
    };
    this.down(e).emit({ hit, event: e });
  }

  private handleMove(e: ViewportPointerEvent): void {
    this.onPointerMove.emit(this.withHit(e));
    const press = this.press;
    if (!press) return;
    if (press.dragging) {
      this.onDragMove.emit(this.dragEvent(e, press));
      return;
    }
    if (
      Math.hypot(e.screen.x - press.screen.x, e.screen.y - press.screen.y) <
      PRESS_THRESHOLD_PX
    )
      return;
    press.dragging = true;
    this.onDragStart.emit(this.dragEvent(e, press, press.hit));
  }

  private handleUp(e: ViewportPointerEvent): void {
    if (e.button === 1) return; // middle is canvas-only
    this.up(e).emit(this.withHit(e));
    const press = this.press;
    if (!press || press.button !== e.button) return;
    this.press = null;
    if (press.dragging) {
      this.onDragEnd.emit(this.dragEvent(e, press));
      return;
    }
    if (performance.now() - press.time > CLICK_MAX_MS) return;
    if (
      Math.hypot(e.screen.x - press.screen.x, e.screen.y - press.screen.y) >
      PRESS_THRESHOLD_PX
    )
      return;
    // Prefer the release hit, fall back to the press hit so a click on the
    // edge of the hover hitbox still selects what was pressed.
    this.click(e).emit({ hit: this.hitTest(e) ?? press.hit, event: e });
  }

  private down(e: ViewportPointerEvent) {
    if (e.button === 2) return this.onRightDown;
    return this.onLeftDown;
  }

  private up(e: ViewportPointerEvent) {
    if (e.button === 2) return this.onRightUp;
    return this.onLeftUp;
  }

  private click(e: ViewportPointerEvent) {
    if (e.button === 2) return this.onRightClick;
    return this.onLeftClick;
  }

  private dragEvent(
    e: ViewportPointerEvent,
    press: Press,
    hit?: HitResult | undefined
  ): ToolDragEvent {
    return {
      hit: hit ?? this.hitTest(e),
      event: e,
      button: press.button,
      origin: { screen: press.screen, world: press.world },
    };
  }

  private withHit(e: ViewportPointerEvent): ToolPointerEvent {
    return { hit: this.hitTest(e), event: e };
  }

  private hitTest(e: ViewportPointerEvent): HitResult | undefined {
    const tolerance = HIT_TOLERANCE_PX / this.viewport.camera.getState().scale;
    return this.scene.hitTest(e.world.x, e.world.y, tolerance);
  }
}
