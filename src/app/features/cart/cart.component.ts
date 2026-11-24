import { Component } from '@angular/core';
import { CurrencyPipe, NgFor, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { StoreService } from '../../core/services/store.service';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CurrencyPipe, NgFor, NgIf, RouterLink],
  templateUrl: './cart.component.html',
})
export class CartComponent {
  checkedOut = false;

  constructor(readonly store: StoreService) {}

  checkout(): void {
    this.store.completeCheckout();
    this.checkedOut = true;
  }

  updateQuantity(productId: string, event: Event): void {
    const quantity = Number((event.target as HTMLInputElement).value);
    this.store.updateQuantity(productId, quantity);
  }
}
