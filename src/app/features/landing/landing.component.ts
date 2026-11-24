import { Component, OnInit } from '@angular/core';
import { DatePipe, NgFor, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MusicDataService } from '../../core/services/music-data.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [DatePipe, NgFor, NgIf, RouterLink],
  templateUrl: './landing.component.html',
})
export class LandingComponent implements OnInit {
  readonly year = new Date();
  error = '';

  constructor(readonly music: MusicDataService) {}

  async ngOnInit(): Promise<void> {
    try {
      await this.music.loadCatalog();
    } catch {
      this.error = 'No pudimos cargar el catálogo. Inténtalo de nuevo más tarde.';
    }
  }
}
