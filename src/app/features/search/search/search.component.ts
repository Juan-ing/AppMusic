import { Component, DestroyRef, OnInit } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../../core/services/auth.service';
import { AudioService } from '../../../core/services/audio.service';
import { LibraryService } from '../../../core/services/library.service';
import { MusicDataService } from '../../../core/services/music-data.service';
import { PlaylistPickerComponent } from '../../../shared/components/playlist-picker/playlist-picker.component';
import type { Song } from '../../../models/music.model';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [FormsModule, NgFor, NgIf, RouterLink, PlaylistPickerComponent],
  templateUrl: './search.component.html',
})
export class SearchComponent implements OnInit {
  term = '';
  genre = '';
  artist = '';
  album = '';
  error = '';
  feedback = '';

  constructor(
    readonly music: MusicDataService,
    readonly audio: AudioService,
    private readonly route: ActivatedRoute,
    private readonly destroyRef: DestroyRef,
    private readonly authService: AuthService,
    private readonly library: LibraryService,
  ) {}

  async ngOnInit(): Promise<void> {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.term = params.get('q') ?? '';
      this.genre = '';
      this.artist = '';
      this.album = '';
    });
    try {
      await this.music.loadCatalog();
      const user = this.authService.user();
      if (user) await this.library.load(user.uid, this.music.songs(), this.music.albums());
    } catch {
      this.error = 'No se pudo cargar el catálogo o tu biblioteca. Vuelve a intentarlo.';
    }
  }

  get suggestions(): string[] {
    return this.term.trim() ? this.music.autocomplete(this.term) : [];
  }

  get genres(): string[] {
    return [...new Set(this.music.songs().map((song) => song.genre).filter(Boolean))];
  }

  get artists(): string[] {
    return [...new Set(this.music.songs().map((song) => song.artist).filter(Boolean))];
  }

  get albums(): string[] {
    return [...new Set(this.music.songs().map((song) => song.album).filter(Boolean))];
  }

  get songs(): Song[] {
    const results = this.term.trim() ? this.music.search(this.term).songs : this.music.songs();
    return results.filter((song) =>
      (!this.genre || song.genre === this.genre)
      && (!this.artist || song.artist === this.artist)
      && (!this.album || song.album === this.album),
    );
  }

  async toggleFavorite(song: Song): Promise<void> {
    const user = this.authService.user();
    if (!user) {
      this.error = 'Inicia sesión para guardar canciones en tus favoritos.';
      return;
    }
    this.feedback = '';
    try {
      await this.library.toggleFavorite(user.uid, song);
      this.feedback = this.isFavorite(song.id) ? 'Canción guardada en Me gusta.' : 'Canción quitada de Me gusta.';
    } catch {
      this.error = 'No se pudo actualizar tu biblioteca.';
    }
  }

  isFavorite(songId: string): boolean {
    return this.library.favorites().some((song) => song.id === songId);
  }

  selectSuggestion(value: string): void {
    this.term = value;
  }

  enqueue(song: Song): void {
    this.audio.enqueue(song);
    this.feedback = `${song.title} agregada a la cola.`;
  }
}
