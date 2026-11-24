import { Injectable, inject, signal } from '@angular/core';
import type { Song } from '../../models/music.model';
import { Queue } from '../../structures/queue';
import { Stack } from '../../structures/stack';
import { AuthService } from './auth.service';
import { LibraryService } from './library.service';

@Injectable({ providedIn: 'root' })
export class AudioService {
  readonly currentSong = signal<Song | null>(null);
  readonly isPlaying = signal(false);
  readonly currentTime = signal(0);
  readonly duration = signal(0);
  readonly volume = signal(0.75);
  readonly shuffle = signal(false);
  readonly repeat = signal<'off' | 'all' | 'one'>('off');
  readonly queue = signal<Song[]>([]);
  readonly error = signal('');
  readonly historyError = signal('');

  private readonly songs = new Queue<Song>();
  private readonly history = new Stack<Song>();
  private readonly authService = inject(AuthService);
  private readonly libraryService = inject(LibraryService);
  private trackList: Song[] = [];
  private audio?: HTMLAudioElement;
  private lastRecordedSongId = '';
  private recordingSongId = '';
  private playRequestId = 0;

  enqueue(song: Song): void {
    if (!this.currentSong()) {
      this.trackList = [song];
      this.setCurrentSong(song);
      this.startAudio(song);
      return;
    }
    this.songs.enqueue(song);
    this.queue.set(this.songs.toArray());
  }

  dequeue(): Song | undefined {
    const song = this.songs.dequeue();
    this.queue.set(this.songs.toArray());
    return song;
  }

  peek(): Song | undefined {
    return this.songs.peek();
  }

  size(): number {
    return this.songs.size();
  }

  playSong(song: Song): void {
    this.songs.clear();
    this.queue.set([]);
    this.trackList = [song];
    this.setCurrentSong(song);
    this.startAudio(song);
  }

  playPlaylist(songs: Song[], startIndex = 0): void {
    if (!songs.length || startIndex < 0 || startIndex >= songs.length) return;
    this.songs.clear();
    this.trackList = [...songs];
    this.setCurrentSong(songs[startIndex]);
    for (const song of songs.slice(startIndex + 1)) this.songs.enqueue(song);
    if (this.shuffle()) this.songs.shuffle();
    this.queue.set(this.songs.toArray());
    this.startAudio(songs[startIndex]);
  }

  private startAudio(song: Song): void {
    const requestId = ++this.playRequestId;
    this.error.set('');
    this.audio?.pause();
    this.isPlaying.set(false);
    if (!song.audioUrl) {
      this.error.set('Esta canción todavía no tiene una fuente de audio disponible.');
      return;
    }
    const audio = this.getAudio();
    if (audio.src !== song.audioUrl) {
      audio.src = song.audioUrl;
      this.currentTime.set(0);
      this.duration.set(0);
    }
    audio.play().then(
      () => {
        if (requestId !== this.playRequestId) return;
        this.isPlaying.set(true);
        this.recordPlayback(song);
      },
      () => {
        if (requestId !== this.playRequestId) return;
        this.isPlaying.set(false);
        this.error.set('No se pudo reproducir esta canción.');
      },
    );
  }

  togglePlayback(): void {
    if (this.isPlaying()) {
      this.audio?.pause();
      this.isPlaying.set(false);
      return;
    }
    const current = this.currentSong();
    if (current) this.startAudio(current);
    else this.playNext();
  }

  playNext(): void {
    const current = this.currentSong();
    if (current && this.repeat() === 'one') {
      this.startAudio(current);
      return;
    }
    if (current) this.history.push(current);
    let next = this.dequeue();
    if (!next && this.repeat() === 'all' && this.trackList.length) {
      for (const song of this.trackList) this.songs.enqueue(song);
      if (this.shuffle()) this.songs.shuffle();
      next = this.dequeue();
    }
    if (next) {
      this.setCurrentSong(next);
      this.startAudio(next);
    }
    else {
      this.currentSong.set(null);
      this.isPlaying.set(false);
    }
  }

  playPrevious(): void {
    const previous = this.history.pop();
    if (previous) {
      this.setCurrentSong(previous);
      this.startAudio(previous);
    }
    else if (this.audio) this.audio.currentTime = 0;
  }

  toggleShuffle(): void {
    const enabled = !this.shuffle();
    this.shuffle.set(enabled);
    if (enabled) this.songs.shuffle();
    this.queue.set(this.songs.toArray());
  }

  cycleRepeat(): void {
    const modes: Array<'off' | 'all' | 'one'> = ['off', 'all', 'one'];
    this.repeat.set(modes[(modes.indexOf(this.repeat()) + 1) % modes.length]);
  }

  setVolume(volume: number): void {
    const value = Math.max(0, Math.min(1, volume));
    this.volume.set(value);
    if (this.audio) this.audio.volume = value;
  }

  seek(time: number): void {
    if (this.audio && Number.isFinite(time)) this.audio.currentTime = time;
  }

  formatTime(seconds: number): string {
    if (!Number.isFinite(seconds)) return '0:00';
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
  }

  private getAudio(): HTMLAudioElement {
    if (!this.audio) {
      this.audio = new Audio();
      this.audio.volume = this.volume();
      this.audio.addEventListener('timeupdate', () => this.currentTime.set(this.audio?.currentTime ?? 0));
      this.audio.addEventListener('loadedmetadata', () => this.duration.set(this.audio?.duration ?? 0));
      this.audio.addEventListener('ended', () => this.playNext());
      this.audio.addEventListener('pause', () => this.isPlaying.set(false));
    }
    return this.audio;
  }

  private setCurrentSong(song: Song): void {
    this.currentSong.set(song);
  }

  private recordPlayback(song: Song): void {
    if (this.lastRecordedSongId === song.id || this.recordingSongId === song.id) return;
    const user = this.authService.user();
    if (!user) return;
    this.recordingSongId = song.id;
    this.historyError.set('');
    void this.libraryService.recordListen(user.uid, song).then(
      () => {
        this.lastRecordedSongId = song.id;
      },
      () => {
        this.historyError.set('No se pudo guardar tu historial de escucha.');
      },
    ).finally(() => {
      if (this.recordingSongId === song.id) this.recordingSongId = '';
    });
  }
}
