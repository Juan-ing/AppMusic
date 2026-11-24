import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { AudioService } from '../../core/services/audio.service';
import { MusicDataService } from '../../core/services/music-data.service';
import { PlaylistService } from '../../core/services/playlist.service';
import type { Playlist, Song } from '../../models/music.model';
import type { Unsubscribe } from 'firebase/firestore';

@Component({
  selector: 'app-playlists',
  standalone: true,
  imports: [FormsModule, NgFor, NgIf],
  templateUrl: './playlists.component.html',
})
export class PlaylistsComponent implements OnInit, OnDestroy {
  readonly playlists = signal<Playlist[]>([]);
  readonly selected = signal<Playlist | null>(null);
  name = '';
  description = '';
  isPublic = false;
  inviteEmail = '';
  editName = '';
  editDescription = '';
  editIsPublic = false;
  error = '';
  feedback = '';
  private unsubscribe?: Unsubscribe;

  constructor(
    readonly auth: AuthService,
    readonly music: MusicDataService,
    readonly audio: AudioService,
    private readonly playlistsService: PlaylistService,
  ) {}

  async ngOnInit(): Promise<void> {
    try {
      await this.music.loadCatalog();
      const user = this.auth.user();
      if (!user) return;
      this.playlists.set(await this.playlistsService.getForUser(user.uid));
      if (this.playlists().length) this.select(this.playlists()[0].id);
    } catch (error) {
      this.error = this.playlistsService.getErrorMessage(error, 'No se pudieron cargar las playlists.');
    }
  }

  ngOnDestroy(): void {
    this.unsubscribe?.();
  }

  async create(): Promise<void> {
    const user = this.auth.user();
    if (!user || !this.name.trim()) return;
    this.error = '';
    try {
      const id = await this.playlistsService.create(user.uid, this.name, this.description, this.isPublic);
      this.name = '';
      this.description = '';
      this.isPublic = false;
      this.playlists.set(await this.playlistsService.getForUser(user.uid));
      this.select(id);
    } catch (error) {
      this.error = this.playlistsService.getErrorMessage(error, 'No se pudo crear la playlist.');
    }
  }

  select(id: string): void {
    this.unsubscribe?.();
    this.unsubscribe = this.playlistsService.subscribe(
      id,
      (playlist) => {
        this.selected.set(playlist);
        if (playlist) {
          this.editName = playlist.name;
          this.editDescription = playlist.description;
          this.editIsPublic = playlist.isPublic;
        }
      },
      (error) => (this.error = this.playlistsService.getErrorMessage(error, 'Se perdió la conexión con esta playlist.')),
    );
  }

  get playlistSongs(): Song[] {
    const ids = this.selected()?.songIds ?? [];
    return ids.map((id) => this.music.songs().find((song) => song.id === id))
      .filter((song): song is Song => song !== undefined);
  }

  async addSong(songId: string): Promise<void> {
    const playlist = this.selected();
    if (!playlist || !songId) return;
    this.error = '';
    this.feedback = '';
    try {
      await this.playlistsService.addSong(playlist.id, songId);
      this.feedback = 'La canción se agregó a la playlist.';
    } catch (error) {
      this.error = this.playlistsService.getErrorMessage(error, 'No se pudo agregar la canción.');
    }
  }

  async removeSong(songId: string): Promise<void> {
    const playlist = this.selected();
    if (!playlist) return;
    try {
      await this.playlistsService.removeSong(playlist.id, songId);
    } catch (error) {
      this.error = this.playlistsService.getErrorMessage(error, 'No se pudo quitar la canción.');
    }
  }

  async moveSong(from: number, to: number): Promise<void> {
    const playlist = this.selected();
    if (!playlist) return;
    try {
      await this.playlistsService.reorder(playlist.id, from, to);
    } catch (error) {
      this.error = this.playlistsService.getErrorMessage(error, 'No se pudo cambiar el orden de la playlist.');
    }
  }

  async undo(): Promise<void> {
    const playlist = this.selected();
    if (!playlist) return;
    try {
      await this.playlistsService.undoReorder(playlist.id);
    } catch (error) {
      this.error = this.playlistsService.getErrorMessage(error, 'No se pudo deshacer el cambio de orden.');
    }
  }

  async redo(): Promise<void> {
    const playlist = this.selected();
    if (!playlist) return;
    try {
      await this.playlistsService.redoReorder(playlist.id);
    } catch (error) {
      this.error = this.playlistsService.getErrorMessage(error, 'No se pudo rehacer el cambio de orden.');
    }
  }

  async invite(): Promise<void> {
    const playlist = this.selected();
    if (!playlist || !this.inviteEmail.trim()) return;
    this.error = '';
    this.feedback = '';
    try {
      await this.playlistsService.inviteCollaborator(playlist.id, this.inviteEmail);
      this.inviteEmail = '';
      this.feedback = 'La persona ya puede colaborar en esta playlist.';
    } catch (error) {
      this.error = this.playlistsService.getErrorMessage(error, 'No se pudo invitar a la persona.');
    }
  }

  async saveDetails(): Promise<void> {
    const playlist = this.selected();
    if (!playlist || !this.editName.trim()) return;
    try {
      await this.playlistsService.updateDetails(
        playlist.id,
        this.editName,
        this.editDescription,
        this.editIsPublic,
      );
      this.feedback = 'Playlist actualizada.';
    } catch (error) {
      this.error = this.playlistsService.getErrorMessage(error, 'No se pudieron guardar los cambios.');
    }
  }
}
