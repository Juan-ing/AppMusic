import { Component, OnInit, signal } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { MusicDataService } from '../../../core/services/music-data.service';
import { AudioService } from '../../../core/services/audio.service';
import { LibraryService } from '../../../core/services/library.service';
import { PlaylistService } from '../../../core/services/playlist.service';
import { PlaylistPickerComponent } from '../../../shared/components/playlist-picker/playlist-picker.component';
import type { Album, Song } from '../../../models/music.model';
import type { Playlist } from '../../../models/music.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [NgFor, NgIf, RouterLink, PlaylistPickerComponent],
  templateUrl: './home.component.html',
})
export class HomeComponent implements OnInit {
  readonly date = new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  readonly genreColors = ['#7c3aed', '#2563eb', '#db2777', '#d97706', '#0d9488', '#be123c'];
  error = '';
  readonly featuredPlaylists = signal<Playlist[]>([]);

  constructor(
    public authService: AuthService,
    readonly music: MusicDataService,
    readonly audio: AudioService,
    readonly library: LibraryService,
    private readonly playlistService: PlaylistService,
  ) {}

  async ngOnInit(): Promise<void> {
    try {
      await this.music.loadCatalog();
      this.featuredPlaylists.set(await this.playlistService.getFeatured());
      const user = this.authService.user();
      if (user) await this.library.load(user.uid, this.music.songs(), this.music.albums());
    } catch {
      this.error = 'No pudimos cargar tu música. Inténtalo nuevamente.';
    }
  }

  genres(): string[] {
    return [...new Set(this.music.songs().map((song) => song.genre).filter(Boolean))].slice(0, 8);
  }

  albums(): Album[] {
    return this.music.albums().slice(0, 8);
  }

  playAlbum(album: Album): void {
    const songs = this.music.songs().filter((song) => song.albumId === album.id);
    this.audio.playPlaylist(songs);
  }

  playSong(song: Song): void {
    this.audio.playSong(song);
  }

  recommendations(): Song[] {
    return this.music.recommendSongsFromLikes(this.library.favorites());
  }

  isFavorite(songId: string): boolean {
    return this.library.favorites().some((song) => song.id === songId);
  }

  async toggleFavorite(song: Song): Promise<void> {
    const user = this.authService.user();
    if (!user) {
      this.error = 'Inicia sesión para guardar canciones en Me gusta.';
      return;
    }

    try {
      await this.library.toggleFavorite(user.uid, song);
    } catch {
      this.error = 'No se pudo actualizar Me gusta en Firebase.';
    }
  }

  async saveAlbum(album: Album): Promise<void> {
    const user = this.authService.user();
    if (!user) return;
    try {
      await this.library.saveAlbum(user.uid, album);
    } catch {
      this.error = 'No se pudo guardar el álbum en tu biblioteca.';
    }
  }
}
