import { Injectable } from '@angular/core';
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  onSnapshot,
  query,
  runTransaction,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import type { Playlist } from '../../models/music.model';
import { db } from '../../firebase/config';
import { Stack } from '../../structures/stack';

@Injectable({ providedIn: 'root' })
export class PlaylistService {
  private readonly orderHistory = new Map<string, Stack<string[]>>();

  getErrorMessage(error: unknown, fallback: string): string {
    const code = typeof error === 'object' && error !== null && 'code' in error
      && typeof error.code === 'string'
      ? error.code
      : '';
    if (code === 'permission-denied') {
      return 'Firestore rechazó la operación. Revisa las reglas de playlists: el usuario debe ser propietario o colaborador.';
    }
    if (code === 'app/timeout' && error instanceof Error) return error.message;
    if (code === 'unavailable' || code === 'deadline-exceeded') {
      return 'No se pudo conectar con Firestore. Verifica tu conexión e inténtalo de nuevo.';
    }
    return error instanceof Error ? error.message : fallback;
  }

  async create(
    ownerId: string,
    name: string,
    description = '',
    isPublic = false,
    initialSongIds: string[] = [],
  ): Promise<string> {
    if (!name.trim()) throw new Error('El nombre de la playlist es obligatorio.');
    const playlist: Omit<Playlist, 'id'> = {
      name: name.trim(),
      description: description.trim(),
      ownerId,
      collaboratorIds: [],
      songIds: [...new Set(initialSongIds.filter(Boolean))],
      isCollaborative: false,
      isPublic,
      updatedAt: new Date().toISOString(),
    };
    const created = await this.withTimeout(addDoc(collection(db, 'playlists'), playlist));
    return created.id;
  }

  async getForUser(userId: string): Promise<Playlist[]> {
    const [owned, shared] = await this.withTimeout(Promise.all([
      getDocs(query(collection(db, 'playlists'), where('ownerId', '==', userId))),
      getDocs(query(collection(db, 'playlists'), where('collaboratorIds', 'array-contains', userId))),
    ]));
    const records = new Map([...owned.docs, ...shared.docs].map((record) => [record.id, record]));
    return Array.from(records.values()).map((record) => ({ ...record.data(), id: record.id }) as Playlist);
  }

  async getFeatured(): Promise<Playlist[]> {
    const snapshot = await getDocs(
      query(collection(db, 'playlists'), where('isPublic', '==', true), limit(20)),
    );
    return snapshot.docs
      .map((record) => ({ ...record.data(), id: record.id }) as Playlist)
      .sort((first, second) => second.songIds.length - first.songIds.length)
      .slice(0, 4);
  }

  subscribe(
    playlistId: string,
    next: (playlist: Playlist | null) => void,
    onError: (error: Error) => void,
  ): Unsubscribe {
    return onSnapshot(
      doc(db, 'playlists', playlistId),
      (snapshot) => next(snapshot.exists() ? ({ ...snapshot.data(), id: snapshot.id } as Playlist) : null),
      onError,
    );
  }

  async updateDetails(
    playlistId: string,
    name: string,
    description: string,
    isPublic: boolean,
  ): Promise<void> {
    if (!name.trim()) throw new Error('El nombre de la playlist es obligatorio.');
    await updateDoc(doc(db, 'playlists', playlistId), {
      name: name.trim(),
      description: description.trim(),
      isPublic,
      updatedAt: new Date().toISOString(),
    });
  }

  async inviteCollaborator(playlistId: string, email: string): Promise<void> {
    const normalizedEmail = email.trim().toLocaleLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      throw new Error('Ingresa un correo electrónico válido.');
    }
    const users = await getDocs(
      query(collection(db, 'users'), where('email', '==', normalizedEmail), limit(1)),
    );
    const collaborator = users.docs[0];
    if (!collaborator) throw new Error('No encontramos una cuenta con ese correo.');
    await updateDoc(doc(db, 'playlists', playlistId), {
      collaboratorIds: arrayUnion(collaborator.id),
      isCollaborative: true,
      updatedAt: new Date().toISOString(),
    });
  }

  async addSong(playlistId: string, songId: string): Promise<void> {
    await this.withTimeout(updateDoc(doc(db, 'playlists', playlistId), {
      songIds: arrayUnion(songId),
      updatedAt: new Date().toISOString(),
    }));
  }

  async removeSong(playlistId: string, songId: string): Promise<void> {
    await updateDoc(doc(db, 'playlists', playlistId), {
      songIds: arrayRemove(songId),
      updatedAt: new Date().toISOString(),
    });
  }

  async reorder(playlistId: string, from: number, to: number): Promise<void> {
    const playlistRef = doc(db, 'playlists', playlistId);
    await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(playlistRef);
      if (!snapshot.exists()) throw new Error('La playlist ya no existe.');
      const songIds = (snapshot.data()['songIds'] ?? []) as string[];
      if (from < 0 || to < 0 || from >= songIds.length || to >= songIds.length) {
        throw new RangeError('La posición seleccionada no es válida.');
      }
      const updated = [...songIds];
      const [moved] = updated.splice(from, 1);
      updated.splice(to, 0, moved);
      this.historyFor(playlistId).push(songIds);
      this.historyFor(playlistId).push(updated);
      transaction.update(playlistRef, { songIds: updated, updatedAt: new Date().toISOString() });
    });
  }

  async undoReorder(playlistId: string): Promise<void> {
    const history = this.orderHistory.get(playlistId);
    if (!history || history.size() < 2) return;
    const previous = history.undo();
    if (previous) {
      await updateDoc(doc(db, 'playlists', playlistId), {
        songIds: previous,
        updatedAt: new Date().toISOString(),
      });
    }
  }

  async redoReorder(playlistId: string): Promise<void> {
    const next = this.orderHistory.get(playlistId)?.redo();
    if (next) {
      await updateDoc(doc(db, 'playlists', playlistId), {
        songIds: next,
        updatedAt: new Date().toISOString(),
      });
    }
  }

  private historyFor(playlistId: string): Stack<string[]> {
    let history = this.orderHistory.get(playlistId);
    if (!history) {
      history = new Stack<string[]>();
      this.orderHistory.set(playlistId, history);
    }
    return history;
  }

  private withTimeout<T>(operation: Promise<T>): Promise<T> {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<T>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(Object.assign(
          new Error('Firestore no respondió en 12 segundos. Verifica la conexión y las reglas de playlists.'),
          { code: 'app/timeout' },
        ));
      }, 12_000);
    });
    return Promise.race([operation, timeout]).finally(() => {
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    });
  }
}
