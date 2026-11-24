import type { Album, Artist, Song } from '../models/music.model';

export interface GenreBranch {
  name: string;
  artists: Map<string, ArtistBranch>;
}

export interface ArtistBranch {
  artist: Artist;
  albums: Map<string, AlbumBranch>;
}

export interface AlbumBranch {
  album: Album;
  songs: Map<string, Song>;
}

export class MusicCatalogTree {
  private readonly genres = new Map<string, GenreBranch>();

  addSong(genreName: string, artist: Artist, album: Album, song: Song): void {
    let genre = this.genres.get(genreName);
    if (!genre) {
      genre = { name: genreName, artists: new Map() };
      this.genres.set(genreName, genre);
    }
    let artistBranch = genre.artists.get(artist.id);
    if (!artistBranch) {
      artistBranch = { artist, albums: new Map() };
      genre.artists.set(artist.id, artistBranch);
    }
    let albumBranch = artistBranch.albums.get(album.id);
    if (!albumBranch) {
      albumBranch = { album, songs: new Map() };
      artistBranch.albums.set(album.id, albumBranch);
    }
    albumBranch.songs.set(song.id, song);
  }

  getGenres(): GenreBranch[] {
    return Array.from(this.genres.values());
  }

  findSong(songId: string): Song | undefined {
    for (const genre of this.genres.values()) {
      for (const artist of genre.artists.values()) {
        for (const album of artist.albums.values()) {
          const song = album.songs.get(songId);
          if (song) return song;
        }
      }
    }
    return undefined;
  }
}
