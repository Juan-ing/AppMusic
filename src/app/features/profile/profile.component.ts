import { Component, OnInit } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { LibraryService } from '../../core/services/library.service';
import { MusicDataService } from '../../core/services/music-data.service';
import { ProfileService } from '../../core/services/profile.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [FormsModule, NgFor, NgIf],
  templateUrl: './profile.component.html',
})
export class ProfileComponent implements OnInit {
  name = '';
  username = '';
  error = '';
  feedback = '';
  busy = false;

  constructor(
    readonly auth: AuthService,
    readonly library: LibraryService,
    private readonly music: MusicDataService,
    private readonly profileService: ProfileService,
  ) {}

  async ngOnInit(): Promise<void> {
    const profile = this.auth.profile();
    this.name = profile?.name ?? '';
    this.username = profile?.username ?? '';
    try {
      await this.music.loadCatalog();
      if (profile) await this.library.load(profile.uid, this.music.songs(), this.music.albums());
    } catch {
      this.error = 'No se pudo cargar la actividad de tu perfil.';
    }
  }

  async save(): Promise<void> {
    this.error = '';
    this.feedback = '';
    this.busy = true;
    try {
      await this.profileService.updateDetails(this.name, this.username);
      this.feedback = 'Perfil actualizado.';
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'No se pudo actualizar el perfil.';
    } finally {
      this.busy = false;
    }
  }

  async uploadPhoto(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.error = '';
    try {
      await this.profileService.uploadPhoto(file);
      this.feedback = 'Foto de perfil actualizada.';
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'No se pudo cambiar la foto.';
    }
  }
}
