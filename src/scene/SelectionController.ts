import { SelState } from './SelState';

export interface Selectable {
  readonly id: string;
}

type Listener = () => void;

export class SelectionController {
  private _selected = new Map<string, Selectable>();
  private _hovered: Selectable | null = null;
  private _listeners = new Set<Listener>();

  get selected(): ReadonlyMap<string, Selectable> {
    return this._selected;
  }

  get hovered(): Selectable | null {
    return this._hovered;
  }

  onChange(fn: Listener): () => void {
    this._listeners.add(fn);
    return () => {
      this._listeners.delete(fn);
    };
  }

  selectOnly(entity: Selectable): void {
    if (this._selected.size === 1 && this._selected.has(entity.id)) return;
    this._selected.clear();
    this._selected.set(entity.id, entity);
    this._notify();
  }

  selectAdd(entity: Selectable): void {
    if (this._selected.has(entity.id)) return;
    this._selected.set(entity.id, entity);
    this._notify();
  }

  selectRemove(entity: Selectable): void {
    if (!this._selected.delete(entity.id)) return;
    this._notify();
  }

  clearSelection(): void {
    if (this._selected.size === 0) return;
    this._selected.clear();
    this._notify();
  }

  setHovered(entity: Selectable | null): void {
    if (this._hovered === entity) return;
    this._hovered = entity;
    this._notify();
  }

  isSelected(id: string): boolean {
    return this._selected.has(id);
  }

  getState(id: string): SelState {
    let s = SelState.None;
    if (this._selected.has(id)) s |= SelState.Selected;
    if (this._hovered?.id === id) s |= SelState.Hovered;
    return s;
  }

  private _notify(): void {
    for (const fn of this._listeners) {
      fn();
    }
  }
}
