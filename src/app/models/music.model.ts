export interface Song {
  id: string;
  title: string;
  artistId: string;
  artist: string;
  albumId: string;
  album: string;
  genre: string;
  duration: number;
  audioUrl: string;
  coverUrl: string;
  releaseDate?: string;
}

export interface Album {
  id: string;
  title: string;
  artistId: string;
  artist: string;
  genre: string;
  coverUrl: string;
  releaseDate?: string;
  songIds: string[];
}

export interface Artist {
  id: string;
  name: string;
  bio: string;
  photoURL: string;
  genres: string[];
  albumIds: string[];
  eventIds: string[];
  relatedArtistIds: string[];
  popularity?: number;
}

export interface MusicEvent {
  id: string;
  artistId: string;
  artist: string;
  title: string;
  venue: string;
  city: string;
  latitude: number;
  longitude: number;
  startsAt: string;
  imageURL: string;
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  collaboratorIds: string[];
  songIds: string[];
  isCollaborative: boolean;
  isPublic: boolean;
  updatedAt: string;
}

export interface UserProfile {
  uid: string;
  name: string;
  username: string;
  email: string;
  photoURL: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  userId: string;
  username: string;
  photoURL: string;
  text: string;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  category: 'merch' | 'vinyl' | 'instrument' | 'other';
  price: number;
  imageURL: string;
  stock: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}
