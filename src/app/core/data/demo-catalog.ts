import type { Artist, Album, MusicEvent, Product, Song } from '../../models/music.model';

interface DemoSongSeed {
  title: string;
  artist: string;
  album: string;
  genre: string;
  duration: number;
}

function slug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

const songSeeds: DemoSongSeed[] = [
  { title: 'Gasolina', artist: 'Daddy Yankee', album: 'Barrio Fino', genre: 'Reguetón', duration: 192 },
  { title: 'Danza Kuduro', artist: 'Don Omar', album: 'Meet the Orphans', genre: 'Reguetón', duration: 198 },
  { title: 'Tusa', artist: 'Karol G', album: 'KG0516', genre: 'Reguetón', duration: 200 },
  { title: 'Dákiti', artist: 'Bad Bunny', album: 'El Último Tour del Mundo', genre: 'Reguetón', duration: 205 },
  { title: 'Tití Me Preguntó', artist: 'Bad Bunny', album: 'Un Verano Sin Ti', genre: 'Reguetón', duration: 244 },
  { title: 'Billie Jean', artist: 'Michael Jackson', album: 'Thriller', genre: 'Pop', duration: 294 },
  { title: 'Like a Prayer', artist: 'Madonna', album: 'Like a Prayer', genre: 'Pop', duration: 343 },
  { title: 'Toxic', artist: 'Britney Spears', album: 'In the Zone', genre: 'Pop', duration: 198 },
  { title: 'Blinding Lights', artist: 'The Weeknd', album: 'After Hours', genre: 'Pop', duration: 200 },
  { title: 'Levitating', artist: 'Dua Lipa', album: 'Future Nostalgia', genre: 'Pop', duration: 203 },
  { title: 'Bohemian Rhapsody', artist: 'Queen', album: 'A Night at the Opera', genre: 'Rock', duration: 354 },
  { title: 'Smells Like Teen Spirit', artist: 'Nirvana', album: 'Nevermind', genre: 'Rock', duration: 301 },
  { title: "Sweet Child O' Mine", artist: "Guns N' Roses", album: 'Appetite for Destruction', genre: 'Rock', duration: 356 },
  { title: 'Livin’ on a Prayer', artist: 'Bon Jovi', album: 'Slippery When Wet', genre: 'Rock', duration: 249 },
  { title: 'Mr. Brightside', artist: 'The Killers', album: 'Hot Fuss', genre: 'Rock', duration: 222 },
  { title: 'One More Time', artist: 'Daft Punk', album: 'Discovery', genre: 'Electrónica', duration: 320 },
  { title: 'Sandstorm', artist: 'Darude', album: 'Before the Storm', genre: 'Electrónica', duration: 225 },
  { title: 'Levels', artist: 'Avicii', album: 'True', genre: 'Electrónica', duration: 202 },
  { title: 'Strobe', artist: 'deadmau5', album: 'For Lack of a Better Name', genre: 'Electrónica', duration: 637 },
  { title: 'Titanium', artist: 'David Guetta', album: 'Nothing but the Beat', genre: 'Electrónica', duration: 245 },
  { title: 'So What', artist: 'Miles Davis', album: 'Kind of Blue', genre: 'Jazz', duration: 562 },
  { title: 'Take Five', artist: 'The Dave Brubeck Quartet', album: 'Time Out', genre: 'Jazz', duration: 324 },
  { title: 'Feeling Good', artist: 'Nina Simone', album: 'I Put a Spell on You', genre: 'Jazz', duration: 174 },
  { title: 'What a Wonderful World', artist: 'Louis Armstrong', album: 'What a Wonderful World', genre: 'Jazz', duration: 140 },
  { title: 'Sing, Sing, Sing', artist: 'Benny Goodman', album: 'The Famous 1938 Carnegie Hall Jazz Concert', genre: 'Jazz', duration: 534 },
];

export const DEMO_SONGS: Song[] = songSeeds.map((seed) => ({
  id: slug(`${seed.artist}-${seed.title}`),
  title: seed.title,
  artistId: slug(seed.artist),
  artist: seed.artist,
  albumId: slug(`${seed.artist}-${seed.album}`),
  album: seed.album,
  genre: seed.genre,
  duration: seed.duration,
  audioUrl: '',
  coverUrl: '',
}));

export function deriveAlbums(songs: Song[]): Album[] {
  return Array.from(
    songs.reduce((albums, song) => {
      const album = albums.get(song.albumId) ?? {
        id: song.albumId,
        title: song.album,
        artistId: song.artistId,
        artist: song.artist,
        genre: song.genre,
        coverUrl: '',
        songIds: [],
      };
      album.songIds.push(song.id);
      albums.set(song.albumId, album);
      return albums;
    }, new Map<string, Album>()).values(),
  );
}

export function deriveArtists(songs: Song[]): Artist[] {
  const artists = Array.from(
    songs.reduce((result, song) => {
      const artist = result.get(song.artistId) ?? {
        id: song.artistId,
        name: song.artist,
        bio: `Descubre canciones de ${song.artist} en este catálogo de demostración.`,
        photoURL: '',
        genres: [],
        albumIds: [],
        eventIds: [],
        relatedArtistIds: [],
      };
      if (!artist.genres.includes(song.genre)) artist.genres.push(song.genre);
      if (!artist.albumIds.includes(song.albumId)) artist.albumIds.push(song.albumId);
      result.set(song.artistId, artist);
      return result;
    }, new Map<string, Artist>()).values(),
  );

  for (const artist of artists) {
    artist.relatedArtistIds = artists
      .filter((other) => other.id !== artist.id && other.genres.some((genre) => artist.genres.includes(genre)))
      .slice(0, 3)
      .map((other) => other.id);
  }
  return artists;
}

export const DEMO_ALBUMS = deriveAlbums(DEMO_SONGS);
export const DEMO_ARTISTS = deriveArtists(DEMO_SONGS);

export const DEMO_EVENTS: MusicEvent[] = [
  {
    id: 'demo-karol-g-bogota',
    artistId: 'karol-g',
    artist: 'Karol G',
    title: 'Noche de música latina',
    venue: 'Movistar Arena',
    city: 'Bogotá',
    latitude: 4.6492,
    longitude: -74.0775,
    startsAt: '2027-03-20T20:00:00-05:00',
    imageURL: '',
  },
  {
    id: 'demo-queen-medellin',
    artistId: 'queen',
    artist: 'Queen',
    title: 'Rock clásico en vivo',
    venue: 'Estadio Atanasio Girardot',
    city: 'Medellín',
    latitude: 6.2562,
    longitude: -75.5905,
    startsAt: '2027-04-10T19:30:00-05:00',
    imageURL: '',
  },
  {
    id: 'demo-daft-punk-cali',
    artistId: 'daft-punk',
    artist: 'Daft Punk',
    title: 'Noche electrónica',
    venue: 'Arena Cañaveralejo',
    city: 'Cali',
    latitude: 3.4145,
    longitude: -76.5417,
    startsAt: '2027-05-08T21:00:00-05:00',
    imageURL: '',
  },
];

export const DEMO_PRODUCTS: Product[] = [
  { id: 'demo-shirt-tour', name: 'Camiseta Soundwave', description: 'Camiseta negra de algodón con diseño musical.', category: 'merch', price: 79000, imageURL: '', stock: 18 },
  { id: 'demo-hoodie-purple', name: 'Hoodie AppMusic', description: 'Buzo cómodo con detalles en morado.', category: 'merch', price: 159000, imageURL: '', stock: 12 },
  { id: 'demo-tote', name: 'Bolsa para discos', description: 'Bolsa reutilizable para llevar tus vinilos.', category: 'merch', price: 42000, imageURL: '', stock: 25 },
  { id: 'demo-cap', name: 'Gorra On Repeat', description: 'Gorra ajustable para tus días de música.', category: 'merch', price: 55000, imageURL: '', stock: 15 },
  { id: 'demo-vinyl-kind-of-blue', name: 'Vinilo Blue Notes', description: 'Edición de colección para amantes del jazz.', category: 'vinyl', price: 145000, imageURL: '', stock: 7 },
  { id: 'demo-vinyl-rock', name: 'Vinilo Rock Classics', description: 'Selección de clásicos del rock en formato vinilo.', category: 'vinyl', price: 132000, imageURL: '', stock: 9 },
  { id: 'demo-vinyl-electronic', name: 'Vinilo Electronic Nights', description: 'Sonidos electrónicos para escuchar de principio a fin.', category: 'vinyl', price: 138000, imageURL: '', stock: 6 },
  { id: 'demo-headphones', name: 'Audífonos Studio', description: 'Audífonos alámbricos para escuchar con comodidad.', category: 'other', price: 219000, imageURL: '', stock: 11 },
  { id: 'demo-guitar', name: 'Ukelele acústico', description: 'Instrumento compacto para empezar a tocar.', category: 'instrument', price: 189000, imageURL: '', stock: 5 },
  { id: 'demo-metronome', name: 'Metrónomo digital', description: 'Accesorio práctico para sesiones de práctica.', category: 'instrument', price: 69000, imageURL: '', stock: 14 },
];
