import { Component, Input } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { PlaylistService } from '../../../core/services/playlist.service';
import type { Playlist, Song } from '../../../models/music.model';

@Component({
  selector: 'app-playlist-picker',
  standalone: true,
  imports: [FormsModule, NgFor, NgIf],
  templateUrl: './playlist-picker.component.html',
})
export class PlaylistPickerComponent {
  @Input({ required: true }) song!: Song;

  isOpen = false;
  loading = false;
  busy = false;
  showCreate = false;
  playlistName = '';
  error = '';
  feedback = '';
  playlists: Playlist[] = [];

  constructor(
    private readonly auth: AuthService,
    private readonly playlistService: PlaylistService,
    private readonly router: Router,
  ) {}

  async open(): Promise<void> {
    const user = this.auth.user();
    if (!user) {
      await this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }

    this.isOpen = true;
    this.loading = true;
    this.error = '';
    this.feedback = '';
    try {
      this.playlists = await this.playlistService.getForUser(user.uid);
      this.showCreate = this.playlists.length === 0;
    } catch (error) {
      this.error = this.playlistService.getErrorMessage(error, 'No se pudieron cargar tus playlists desde Firebase.');
    } finally {
      this.loading = false;
    }
  }

  close(): void {
    this.isOpen = false;
  }

  async addToPlaylist(playlist: Playlist): Promise<void> {
    this.busy = true;
    this.error = '';
    this.feedback = '';
    try {
      await this.playlistService.addSong(playlist.id, this.song.id);
      this.feedback = `“${this.song.title}” se agregó a “${playlist.name}”.`;
    } catch (error) {
      this.error = this.playlistService.getErrorMessage(error, 'No se pudo agregar la canción a la playlist.');
    } finally {
      this.busy = false;
    }
  }

  async createPlaylist(): Promise<void> {
    const user = this.auth.user();
    const name = this.playlistName.trim();
    if (!user || !name) return;

    this.busy = true;
    this.error = '';
    this.feedback = '';
    try {
      const id = await this.playlistService.create(user.uid, name, '', false, [this.song.id]);
      const created: Playlist = {
        id,
        name,
        description: '',
        ownerId: user.uid,
        collaboratorIds: [],
        songIds: [this.song.id],
        isCollaborative: false,
        isPublic: false,
        updatedAt: new Date().toISOString(),
      };
      this.playlists = [created, ...this.playlists];
      this.playlistName = '';
      this.showCreate = false;
      this.feedback = `Playlist “${name}” creada con “${this.song.title}”.`;
    } catch (error) {
      this.error = this.playlistService.getErrorMessage(error, 'No se pudo crear la playlist en Firebase.');
    } finally {
      this.busy = false;
    }
  }
}
