import { Injectable, signal } from '@angular/core';
import { collection, getDocs } from 'firebase/firestore';
import type { Album, Artist, MusicEvent, Product, Song } from '../../models/music.model';
import { db } from '../../firebase/config';
import { Graph } from '../../structures/graph';
import { MusicCatalogTree } from '../../structures/tree';
import { Trie } from '../../structures/trie';
import {
  DEMO_ALBUMS,
  DEMO_ARTISTS,
  DEMO_EVENTS,
  DEMO_PRODUCTS,
  DEMO_SONGS,
  deriveAlbums,
  deriveArtists,
} from '../data/demo-catalog';

@Injectable({ providedIn: 'root' })
export class MusicDataService {
  readonly songs = signal<Song[]>(DEMO_SONGS);
  readonly albums = signal<Album[]>(DEMO_ALBUMS);
  readonly artists = signal<Artist[]>(DEMO_ARTISTS);
  readonly events = signal<MusicEvent[]>(DEMO_EVENTS);
  readonly products = signal<Product[]>(DEMO_PRODUCTS);
  readonly loading = signal(false);
  readonly demoMode = signal(true);
  readonly demoNotice = signal('Catálogo de demostración local. Firebase reemplazará cada colección cuando tenga datos.');

  private searchIndex = new Trie();
  private catalog = new MusicCatalogTree();
  private artistGraph = new Graph<Artist>();

  constructor() {
    this.rebuildIndexes(DEMO_SONGS, DEMO_ALBUMS, DEMO_ARTISTS);
  }

  get catalogTree(): MusicCatalogTree {
    return this.catalog;
  }

  async loadCatalog(): Promise<void> {
    this.loading.set(true);
    try {
      const [remoteSongs, remoteAlbums, remoteArtists, remoteEvents, remoteProducts] = await Promise.all([
        this.readCollection<Song>('songs'),
        this.readCollection<Album>('albums'),
        this.readCollection<Artist>('artists'),
        this.readCollection<MusicEvent>('events'),
        this.readCollection<Product>('products'),
      ]);
      const songs = remoteSongs.length ? remoteSongs : DEMO_SONGS;
      const albumsById = new Map(
        [...deriveAlbums(songs), ...remoteAlbums].map((album) => [album.id, album]),
      );
      const artistsById = new Map(
        [...deriveArtists(songs), ...remoteArtists].map((artist) => [artist.id, artist]),
      );
      const albums = Array.from(albumsById.values());
      const artists = Array.from(artistsById.values());
      const events = remoteEvents.length
        ? remoteEvents
        : remoteSongs.length === 0 && remoteArtists.length === 0
          ? DEMO_EVENTS
          : [];
      const products = remoteProducts.length ? remoteProducts : DEMO_PRODUCTS;
      const demoCollections = [
        !remoteSongs.length && 'canciones',
        !remoteProducts.length && 'productos',
        !remoteEvents.length && !remoteSongs.length && !remoteArtists.length && 'eventos',
      ].filter((value): value is string => Boolean(value));
      this.songs.set(songs);
      this.albums.set(albums);
      this.artists.set(artists);
      this.events.set(events);
      this.products.set(products);
      this.rebuildIndexes(songs, albums, artists);
      this.demoMode.set(demoCollections.length > 0);
      this.demoNotice.set(
        demoCollections.length
          ? `Datos de demostración para: ${demoCollections.join(', ')}.`
          : '',
      );
    } catch {
      this.demoMode.set(true);
      this.demoNotice.set('No se pudo conectar a Firebase. Se mantiene el catálogo de demostración local.');
    } finally {
      this.loading.set(false);
    }
  }

  search(term: string): { songs: Song[]; albums: Album[]; artists: Artist[] } {
    const normalized = term.trim().toLocaleLowerCase();
    if (!normalized) return { songs: [], albums: [], artists: [] };
    const contains = (value: string): boolean => value.toLocaleLowerCase().includes(normalized);
    return {
      songs: this.songs().filter((song) =>
        [song.title, song.artist, song.album, song.genre].some(contains),
      ),
      albums: this.albums().filter((album) =>
        [album.title, album.artist, album.genre].some(contains),
      ),
      artists: this.artists().filter((artist) =>
        [artist.name, artist.bio, ...artist.genres].some(contains),
      ),
    };
  }

  autocomplete(prefix: string): string[] {
    return this.searchIndex.autocomplete(prefix);
  }

  similarArtists(artistId: string): Artist[] {
    return this.artistGraph.recommendSimilar(artistId);
  }

  recommendSongsFromLikes(likedSongs: Song[], limit = 8): Song[] {
    if (!likedSongs.length || limit <= 0) return [];

    const likedSongIds = new Set(likedSongs.map((song) => song.id));
    const likedArtistIds = new Set(likedSongs.map((song) => song.artistId));
    const artistsById = new Map(this.artists().map((artist) => [artist.id, artist]));
    const artistScores = new Map<string, number>();

    for (const likedArtistId of likedArtistIds) {
      const likedArtist = artistsById.get(likedArtistId);
      if (!likedArtist) continue;

      for (const relatedArtist of this.artistGraph.recommendSimilar(likedArtistId, artistsById.size)) {
        if (likedArtistIds.has(relatedArtist.id)) continue;
        const sharedGenres = relatedArtist.genres.filter((genre) => likedArtist.genres.includes(genre)).length;
        artistScores.set(
          relatedArtist.id,
          (artistScores.get(relatedArtist.id) ?? 0) + 1 + sharedGenres * 0.25,
        );
      }
    }

    return this.songs()
      .filter((song) => !likedSongIds.has(song.id) && artistScores.has(song.artistId))
      .sort((first, second) =>
        (artistScores.get(second.artistId) ?? 0) - (artistScores.get(first.artistId) ?? 0)
        || first.title.localeCompare(second.title),
      )
      .slice(0, limit);
  }

  private async readCollection<T extends { id: string }>(name: string): Promise<T[]> {
    const snapshot = await getDocs(collection(db, name));
    return snapshot.docs.map((record) => ({ ...record.data(), id: record.id }) as T);
  }

  private rebuildIndexes(songs: Song[], albums: Album[], artists: Artist[]): void {
    this.searchIndex = new Trie();
    this.catalog = new MusicCatalogTree();
    this.artistGraph = new Graph<Artist>();
    for (const artist of artists) {
      this.artistGraph.addNode(artist);
      this.searchIndex.insert(artist.name);
    }
    for (const artist of artists) {
      for (const relatedId of artist.relatedArtistIds ?? []) {
        this.artistGraph.addEdge(artist.id, relatedId);
      }
    }
    const genresByArtist = new Map<string, Set<string>>();
    for (const song of songs) {
      if (!song.genre) continue;
      const genres = genresByArtist.get(song.artistId) ?? new Set<string>();
      genres.add(song.genre);
      genresByArtist.set(song.artistId, genres);
    }
    artists.forEach((artist, index) => {
      for (const related of artists.slice(index + 1)) {
        const artistGenres = new Set([...(artist.genres ?? []), ...(genresByArtist.get(artist.id) ?? [])]);
        const relatedGenres = new Set([...(related.genres ?? []), ...(genresByArtist.get(related.id) ?? [])]);
        const sharesGenre = Array.from(artistGenres).some((genre) => relatedGenres.has(genre));
        if (sharesGenre) this.artistGraph.addEdge(artist.id, related.id);
      }
    });
    for (const album of albums) this.searchIndex.insert(album.title);
    for (const song of songs) {
      this.searchIndex.insert(song.title);
      this.searchIndex.insert(song.genre);
      const artist = artists.find((entry) => entry.id === song.artistId);
      const album = albums.find((entry) => entry.id === song.albumId);
      if (artist && album) this.catalog.addSong(song.genre, artist, album, song);
    }
  }
}
