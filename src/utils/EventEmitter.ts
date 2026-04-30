export class EventEmitter<T = void> {
  private listeners: Set<(data: T) => void> = new Set();

  public subscribe(callback: (data: T) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  public emit(...args: T extends void ? [] : [data: T]) {
    const data = args[0] as T;
    this.listeners.forEach((callback) => callback(data));
  }
}
