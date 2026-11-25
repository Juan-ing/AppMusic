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
  private simulationContext?: AudioContext;
  private simulationMaster?: GainNode;
  private simulationOscillators: OscillatorNode[] = [];
  private simulationTimer?: number;
  private simulationStartedAt = 0;
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
    this.stopSimulation();
    this.audio?.pause();
    this.isPlaying.set(false);
    if (!song.audioUrl) {
      this.startSimulation(song, requestId);
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
      this.stopSimulation();
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
      this.currentTime.set(0);
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
      this.duration.set(0);
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
    if (this.simulationContext && this.simulationMaster) {
      this.simulationMaster.gain.setTargetAtTime(value * 0.25, this.simulationContext.currentTime, 0.02);
    }
  }

  seek(time: number): void {
    if (!Number.isFinite(time)) return;
    const position = Math.max(0, Math.min(this.duration(), time));
    if (this.currentSong()?.audioUrl && this.audio) {
      this.audio.currentTime = position;
      return;
    }
    this.currentTime.set(position);
    if (this.simulationContext && this.isPlaying()) {
      this.simulationStartedAt = this.simulationContext.currentTime - position;
    }
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
    if (this.currentSong()?.id !== song.id) {
      this.currentTime.set(0);
      this.duration.set(song.duration);
    }
    this.currentSong.set(song);
  }

  private startSimulation(song: Song, requestId: number): void {
    if (typeof window === 'undefined' || typeof window.AudioContext === 'undefined') {
      this.error.set('La reproducción de demostración no está disponible en este navegador.');
      return;
    }

    const context = this.simulationContext ?? new AudioContext();
    this.simulationContext = context;
    void context.resume().then(
      () => {
        if (requestId !== this.playRequestId) return;

        const master = context.createGain();
        master.gain.value = this.volume() * 0.25;
        master.connect(context.destination);
        this.simulationMaster = master;

        const voices = [
          { type: 'triangle' as const, gain: 0.18 },
          { type: 'sine' as const, gain: 0.1 },
          { type: 'sine' as const, gain: 0.2 },
        ];
        this.simulationOscillators = voices.map(({ type, gain }) => {
          const oscillator = context.createOscillator();
          const voiceGain = context.createGain();
          oscillator.type = type;
          voiceGain.gain.value = gain;
          oscillator.connect(voiceGain);
          voiceGain.connect(master);
          oscillator.start();
          return oscillator;
        });

        this.duration.set(song.duration);
        this.simulationStartedAt = context.currentTime - this.currentTime();
        this.isPlaying.set(true);
        this.recordPlayback(song);

        const notes = [261.63, 293.66, 349.23, 392, 440, 392, 349.23, 293.66];
        const offset = Array.from(song.id).reduce((total, character) => total + character.charCodeAt(0), 0);
        let lastBeat = -1;
        this.simulationTimer = window.setInterval(() => {
          if (requestId !== this.playRequestId) return;
          const elapsed = Math.max(0, context.currentTime - this.simulationStartedAt);
          this.currentTime.set(Math.min(elapsed, song.duration));
          if (elapsed >= song.duration) {
            this.playNext();
            return;
          }

          const beat = Math.floor(elapsed / 0.42);
          if (beat !== lastBeat) {
            lastBeat = beat;
            const note = notes[(beat + offset) % notes.length];
            const now = context.currentTime;
            this.simulationOscillators[0].frequency.setTargetAtTime(note, now, 0.04);
            this.simulationOscillators[1].frequency.setTargetAtTime(note * 1.25, now, 0.05);
            this.simulationOscillators[2].frequency.setTargetAtTime(note / 2, now, 0.06);
          }
        }, 100);
      },
      () => {
        if (requestId !== this.playRequestId) return;
        this.error.set('No se pudo iniciar la reproducción de demostración.');
        this.isPlaying.set(false);
      },
    );
  }

  private stopSimulation(): void {
    if (this.simulationTimer !== undefined) {
      window.clearInterval(this.simulationTimer);
      this.simulationTimer = undefined;
    }
    for (const oscillator of this.simulationOscillators) {
      oscillator.stop();
      oscillator.disconnect();
    }
    this.simulationOscillators = [];
    this.simulationMaster?.disconnect();
    this.simulationMaster = undefined;
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
