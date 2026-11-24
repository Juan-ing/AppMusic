import { Injectable, computed, signal } from '@angular/core';
import type { CartItem, Product } from '../../models/music.model';

@Injectable({ providedIn: 'root' })
export class StoreService {
  readonly cart = signal<CartItem[]>([]);
  readonly subtotal = computed(() =>
    this.cart().reduce((total, item) => total + item.product.price * item.quantity, 0),
  );
  readonly itemCount = computed(() =>
    this.cart().reduce((total, item) => total + item.quantity, 0),
  );

  add(product: Product): void {
    this.cart.update((items) => {
      const existing = items.find((item) => item.product.id === product.id);
      if (existing) {
        return items.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: Math.min(item.quantity + 1, product.stock) }
            : item,
        );
      }
      if (product.stock < 1) return items;
      return [...items, { product, quantity: 1 }];
    });
  }

  updateQuantity(productId: string, quantity: number): void {
    if (quantity <= 0) {
      this.remove(productId);
      return;
    }
    this.cart.update((items) =>
      items.map((item) =>
        item.product.id === productId
          ? { ...item, quantity: Math.min(Math.floor(quantity), item.product.stock) }
          : item,
      ),
    );
  }

  remove(productId: string): void {
    this.cart.update((items) => items.filter((item) => item.product.id !== productId));
  }

  completeCheckout(): void {
    this.cart.set([]);
  }
}
