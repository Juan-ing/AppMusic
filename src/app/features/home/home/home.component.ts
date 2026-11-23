import { Component } from '@angular/core';
import { NgFor } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [NgFor],
  templateUrl: './home.component.html',
})
export class HomeComponent {
  readonly date = new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  readonly albums = [
    { title: 'Midnight City', artist: 'Luna Vega', genre: 'Electrónica', color: 'linear-gradient(135deg,#5b21b6,#ec4899)' },
    { title: 'Aurora', artist: 'Atlas', genre: 'Indie', color: 'linear-gradient(135deg,#312e81,#06b6d4)' },
    { title: 'Purple Dreams', artist: 'Luna Vega', genre: 'Alternative', color: 'linear-gradient(135deg,#7c3aed,#1e1b4b)' },
    { title: 'Sin gravedad', artist: 'Atlas', genre: 'Indie', color: 'linear-gradient(135deg,#0f172a,#f59e0b)' },
  ];

  readonly genres = [
    { name: 'Electrónica', color: '#7c3aed' },
    { name: 'Indie', color: '#2563eb' },
    { name: 'Hip-hop', color: '#db2777' },
    { name: 'Jazz', color: '#d97706' },
  ];

  constructor(public authService: AuthService) {}
}
