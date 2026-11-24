import { Component, OnInit } from '@angular/core';
import { NgFor, NgIf, CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MusicDataService } from '../../core/services/music-data.service';
import { StoreService } from '../../core/services/store.service';
import type { Product } from '../../models/music.model';

@Component({
  selector: 'app-store',
  standalone: true,
  imports: [CurrencyPipe, NgFor, NgIf, RouterLink],
  templateUrl: './store.component.html',
})
export class StoreComponent implements OnInit {
  category = '';
  error = '';

  constructor(readonly music: MusicDataService, readonly store: StoreService) {}

  async ngOnInit(): Promise<void> {
    try {
      await this.music.loadCatalog();
    } catch {
      this.error = 'No se pudo cargar la tienda.';
    }
  }

  get products(): Product[] {
    return this.music.products().filter((product) => !this.category || product.category === this.category);
  }
}
