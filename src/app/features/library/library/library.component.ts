import { Component, OnInit } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { AudioService } from '../../../core/services/audio.service';
import { LibraryService } from '../../../core/services/library.service';
import { MusicDataService } from '../../../core/services/music-data.service';
import type { Song } from '../../../models/music.model';

@Component({
  selector: 'app-library',
  standalone: true,
  imports: [NgFor, NgIf, RouterLink],
  templateUrl: './library.component.html',
})
export class LibraryComponent implements OnInit {
  tab: 'recent' | 'favorites' | 'playlists' | 'albums' = 'recent';
  error = '';

  constructor(
    readonly authService: AuthService,
    readonly audio: AudioService,
    readonly library: LibraryService,
    private readonly music: MusicDataService,
  ) {}

  async ngOnInit(): Promise<void> {
    try {
      await this.music.loadCatalog();
      const user = this.authService.user();
      if (user) await this.library.load(user.uid, this.music.songs(), this.music.albums());
    } catch {
      this.error = 'No se pudo cargar tu biblioteca.';
    }
  }

  songs(): Song[] {
    return this.tab === 'favorites' ? this.library.favorites() : this.library.recentSongs();
  }
}
