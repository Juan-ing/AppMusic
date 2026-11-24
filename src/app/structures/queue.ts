export class Queue<T> {
  private items: T[] = [];
  private head = 0;

  enqueue(item: T): void {
    this.items.push(item);
  }

  dequeue(): T | undefined {
    if (this.head >= this.items.length) return undefined;
    const item = this.items[this.head++];
    if (this.head > 32 && this.head * 2 >= this.items.length) {
      this.items = this.items.slice(this.head);
      this.head = 0;
    }
    return item;
  }

  peek(): T | undefined {
    return this.items[this.head];
  }

  size(): number {
    return this.items.length - this.head;
  }

  clear(): void {
    this.items = [];
    this.head = 0;
  }

  toArray(): T[] {
    return this.items.slice(this.head);
  }

  shuffle(random: () => number = Math.random): void {
    const remaining = this.toArray();
    for (let index = remaining.length - 1; index > 0; index--) {
      const target = Math.floor(random() * (index + 1));
      [remaining[index], remaining[target]] = [remaining[target], remaining[index]];
    }
    this.items = remaining;
    this.head = 0;
  }
}
