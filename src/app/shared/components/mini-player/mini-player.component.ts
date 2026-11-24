import { Component } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { AudioService } from '../../../core/services/audio.service';

@Component({
  selector: 'app-mini-player',
  standalone: true,
  imports: [NgFor, NgIf],
  templateUrl: './mini-player.component.html',
})
export class MiniPlayerComponent {
  queueOpen = false;

  constructor(readonly audio: AudioService) {}

  seek(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.audio.seek(value);
  }

  setVolume(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.audio.setVolume(value);
  }

  get progress(): number {
    return this.audio.duration() > 0
      ? (this.audio.currentTime() / this.audio.duration()) * 100
      : 0;
  }
}
