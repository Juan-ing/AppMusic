import { Component, OnInit } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { AudioService } from '../../../core/services/audio.service';
import { LibraryService } from '../../../core/services/library.service';
import { MusicDataService } from '../../../core/services/music-data.service';

@Component({
  selector: 'app-favorites',
  standalone: true,
  imports: [NgFor, NgIf],
  templateUrl: './favorites.component.html',
})
export class FavoritesComponent implements OnInit {
  error = '';

  constructor(
    readonly auth: AuthService,
    readonly audio: AudioService,
    readonly library: LibraryService,
    private readonly music: MusicDataService,
  ) {}

  async ngOnInit(): Promise<void> {
    try {
      await this.music.loadCatalog();
      const user = this.auth.user();
      if (user) await this.library.load(user.uid, this.music.songs(), this.music.albums());
    } catch {
      this.error = 'No pudimos cargar tus favoritos.';
    }
  }

  async remove(songId: string): Promise<void> {
    const user = this.auth.user();
    const song = this.library.favorites().find((item) => item.id === songId);
    if (!user || !song) return;
    try {
      await this.library.toggleFavorite(user.uid, song);
    } catch {
      this.error = 'No se pudo quitar la canción de favoritos.';
    }
  }
}
