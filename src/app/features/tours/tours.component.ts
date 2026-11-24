import { Component, OnInit } from '@angular/core';
import { DatePipe, NgFor, NgIf } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MusicDataService } from '../../core/services/music-data.service';
import type { MusicEvent } from '../../models/music.model';

@Component({
  selector: 'app-tours',
  standalone: true,
  imports: [DatePipe, NgFor, NgIf],
  templateUrl: './tours.component.html',
})
export class ToursComponent implements OnInit {
  selected: MusicEvent | null = null;
  mapUrl: SafeResourceUrl | null = null;
  error = '';

  constructor(readonly music: MusicDataService, private readonly sanitizer: DomSanitizer) {}

  async ngOnInit(): Promise<void> {
    try {
      await this.music.loadCatalog();
      const firstEvent = this.music.events()[0];
      if (firstEvent) this.selectEvent(firstEvent);
    } catch {
      this.error = 'No se pudieron cargar los eventos.';
    }
  }

  selectEvent(event: MusicEvent): void {
    this.selected = event;
    if (
      !Number.isFinite(event.latitude)
      || event.latitude < -90
      || event.latitude > 90
      || !Number.isFinite(event.longitude)
      || event.longitude < -180
      || event.longitude > 180
    ) {
      this.mapUrl = null;
      this.error = 'Este evento tiene coordenadas inválidas.';
      return;
    }
    this.error = '';
    const margin = 0.12;
    const bbox = [
      event.longitude - margin,
      event.latitude - margin,
      event.longitude + margin,
      event.latitude + margin,
    ].join(',');
    const url = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${event.latitude},${event.longitude}`;
    this.mapUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }
}
