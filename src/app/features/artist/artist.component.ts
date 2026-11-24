import { Component, OnInit } from '@angular/core';
import { DatePipe, NgFor, NgIf } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AudioService } from '../../core/services/audio.service';
import { AuthService } from '../../core/services/auth.service';
import { LibraryService } from '../../core/services/library.service';
import { MusicDataService } from '../../core/services/music-data.service';
import { PlaylistPickerComponent } from '../../shared/components/playlist-picker/playlist-picker.component';
import type { Artist, Song } from '../../models/music.model';

@Component({
  selector: 'app-artist',
  standalone: true,
  imports: [DatePipe, NgFor, NgIf, RouterLink, PlaylistPickerComponent],
  templateUrl: './artist.component.html',
})
export class ArtistComponent implements OnInit {
  artist: Artist | null = null;
  error = '';

  constructor(
    private readonly route: ActivatedRoute,
    readonly music: MusicDataService,
    readonly audio: AudioService,
    readonly auth: AuthService,
    readonly library: LibraryService,
  ) {}

  async ngOnInit(): Promise<void> {
    const artistId = this.route.snapshot.paramMap.get('id');
    this.artist = this.music.artists().find((artist) => artist.id === artistId) ?? null;
    try {
      await this.music.loadCatalog();
      this.artist = this.music.artists().find((artist) => artist.id === artistId) ?? null;
      const user = this.auth.user();
      if (user) {
        try {
          await this.library.load(user.uid, this.music.songs(), this.music.albums());
        } catch {
          this.error = 'No se pudo cargar tu biblioteca desde Firebase.';
        }
      }
    } catch {
      this.error = 'No se pudo cargar el perfil del artista.';
    }
  }

  get songs(): Song[] {
    return this.music.songs().filter((song) => song.artistId === this.artist?.id);
  }

  get albums() {
    return this.music.albums().filter((album) => album.artistId === this.artist?.id);
  }

  get events() {
    return this.music.events().filter((event) => event.artistId === this.artist?.id);
  }

  get similar() {
    return this.artist ? this.music.similarArtists(this.artist.id) : [];
  }

  isFavorite(songId: string): boolean {
    return this.library.favorites().some((song) => song.id === songId);
  }

  async toggleFavorite(song: Song): Promise<void> {
    const user = this.auth.user();
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
}
