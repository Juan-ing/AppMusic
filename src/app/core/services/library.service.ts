import { Injectable, signal } from '@angular/core';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import type { Album, Playlist, Song } from '../../models/music.model';
import { db } from '../../firebase/config';

@Injectable({ providedIn: 'root' })
export class LibraryService {
  readonly playlists = signal<Playlist[]>([]);
  readonly favorites = signal<Song[]>([]);
  readonly recentSongs = signal<Song[]>([]);
  readonly savedAlbums = signal<Album[]>([]);

  async load(userId: string, songs: Song[], albums: Album[]): Promise<void> {
    this.playlists.set([]);
    this.favorites.set([]);
    this.recentSongs.set([]);
    this.savedAlbums.set([]);
    const [ownedPlaylists, sharedPlaylists, favoriteDocs, recentDocs, albumDocs] = await Promise.all([
      getDocs(query(collection(db, 'playlists'), where('ownerId', '==', userId))),
      getDocs(query(collection(db, 'playlists'), where('collaboratorIds', 'array-contains', userId))),
      getDocs(collection(db, 'users', userId, 'favorites')),
      getDocs(query(collection(db, 'users', userId, 'history'), orderBy('playedAt', 'desc'), limit(20))),
      getDocs(collection(db, 'users', userId, 'savedAlbums')),
    ]);
    const playlists = new Map(
      [...ownedPlaylists.docs, ...sharedPlaylists.docs].map((record) => [record.id, record]),
    );
    this.playlists.set(
      Array.from(playlists.values()).map((record) => ({ ...record.data(), id: record.id }) as Playlist),
    );
    this.favorites.set(
      favoriteDocs.docs
        .map((record) => songs.find((song) => song.id === record.id))
        .filter((song): song is Song => song !== undefined),
    );
    this.recentSongs.set(
      recentDocs.docs
        .map((record) => songs.find((song) => song.id === record.id))
        .filter((song): song is Song => song !== undefined),
    );
    this.savedAlbums.set(
      albumDocs.docs
        .map((record) => albums.find((album) => album.id === record.id))
        .filter((album): album is Album => album !== undefined),
    );
  }

  async toggleFavorite(userId: string, song: Song): Promise<void> {
    const favoriteRef = doc(db, 'users', userId, 'favorites', song.id);
    const snapshot = await getDoc(favoriteRef);
    if (snapshot.exists()) {
      await deleteDoc(favoriteRef);
      this.favorites.update((favorites) => favorites.filter((favorite) => favorite.id !== song.id));
    } else {
      await setDoc(favoriteRef, { songId: song.id, createdAt: new Date().toISOString() });
      this.favorites.update((favorites) => [song, ...favorites]);
    }
  }

  async saveAlbum(userId: string, album: Album): Promise<void> {
    await setDoc(doc(db, 'users', userId, 'savedAlbums', album.id), {
      albumId: album.id,
      savedAt: new Date().toISOString(),
    });
    this.savedAlbums.update((albums) =>
      albums.some((saved) => saved.id === album.id) ? albums : [album, ...albums],
    );
  }

  async recordListen(userId: string, song: Song): Promise<void> {
    await addDoc(collection(db, 'users', userId, 'history'), {
      songId: song.id,
      playedAt: serverTimestamp(),
    });
    this.recentSongs.update((songs) =>
      [song, ...songs.filter((recent) => recent.id !== song.id)].slice(0, 20),
    );
  }
}
