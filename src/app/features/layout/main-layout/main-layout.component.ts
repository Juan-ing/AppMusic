import { Component, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { BottomNavComponent } from '../../../shared/components/bottom-nav/bottom-nav.component';
import { NgFor, NgIf } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { FormsModule } from '@angular/forms';
import { MiniPlayerComponent } from '../../../shared/components/mini-player/mini-player.component';
import { PlaylistService } from '../../../core/services/playlist.service';
import { MusicDataService } from '../../../core/services/music-data.service';
import type { Playlist } from '../../../models/music.model';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, BottomNavComponent, MiniPlayerComponent, RouterLink, RouterLinkActive, NgFor, NgIf, FormsModule],
  templateUrl: './main-layout.component.html',
})
export class MainLayoutComponent implements OnInit {
  menuOpen = false;
  userMenuOpen = false;
  searchTerm = '';
  playlists: Playlist[] = [];
  layoutError = '';

  constructor(
    public authService: AuthService,
    readonly music: MusicDataService,
    private router: Router,
    private readonly playlistService: PlaylistService,
  ) {}

  async ngOnInit(): Promise<void> {
    this.layoutError = this.authService.profileError();
    const user = this.authService.user();
    if (!user) return;
    try {
      this.playlists = await this.playlistService.getForUser(user.uid);
    } catch {
      this.layoutError = 'No se pudieron cargar tus playlists.';
    }
  }

  openSearch(): void {
    void this.router.navigate(['/dashboard/search'], {
      queryParams: this.searchTerm.trim() ? { q: this.searchTerm.trim() } : {},
    });
  }

  async logout() {
    await this.authService.logout();
    await this.router.navigate(['/login']);
  }
}
