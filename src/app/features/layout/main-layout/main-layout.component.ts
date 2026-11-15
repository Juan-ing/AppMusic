import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BottomNavComponent } from '../../../shared/components/bottom-nav/bottom-nav.component';
import { MiniPlayerComponent } from '../../../shared/components/mini-player/mini-player.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, MiniPlayerComponent, BottomNavComponent],
  templateUrl: './main-layout.component.html',
})
export class MainLayoutComponent {}
