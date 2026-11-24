export class Stack<T> {
  private items: T[] = [];
  private redoItems: T[] = [];

  push(item: T): void {
    this.items.push(item);
    this.redoItems = [];
  }

  pop(): T | undefined {
    return this.items.pop();
  }

  peek(): T | undefined {
    return this.items[this.items.length - 1];
  }

  size(): number {
    return this.items.length;
  }

  undo(): T | undefined {
    if (this.items.length < 2) return this.peek();
    const current = this.items.pop();
    if (current !== undefined) this.redoItems.push(current);
    return this.peek();
  }

  redo(): T | undefined {
    const next = this.redoItems.pop();
    if (next === undefined) return this.peek();
    this.items.push(next);
    return next;
  }

  clear(): void {
    this.items = [];
    this.redoItems = [];
  }
}
