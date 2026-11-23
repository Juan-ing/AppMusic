import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BottomNavComponent } from '../../../shared/components/bottom-nav/bottom-nav.component';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NgIf } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, BottomNavComponent, RouterLink, RouterLinkActive, NgIf],
  templateUrl: './main-layout.component.html',
})
export class MainLayoutComponent {
  menuOpen = false;
  userMenuOpen = false;

  constructor(public authService: AuthService, private router: Router) {}

  async logout() {
    await this.authService.logout();
    await this.router.navigate(['/login']);
  }
}
