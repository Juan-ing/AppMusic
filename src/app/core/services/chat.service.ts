import { Injectable } from '@angular/core';
import {
  addDoc,
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  type Unsubscribe,
} from 'firebase/firestore';
import type { ChatMessage } from '../../models/music.model';
import { db } from '../../firebase/config';

@Injectable({ providedIn: 'root' })
export class ChatService {
  listen(
    roomId: string,
    next: (messages: ChatMessage[]) => void,
    onError: (error: Error) => void,
  ): Unsubscribe {
    const messagesQuery = query(
      collection(db, 'chatRooms', roomId, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(100),
    );
    return onSnapshot(
      messagesQuery,
      (snapshot) =>
        next(snapshot.docs.map((message) => ({ ...message.data(), id: message.id }) as ChatMessage)),
      onError,
    );
  }

  async send(roomId: string, user: { uid: string; name: string; photoURL: string }, text: string): Promise<void> {
    const message = text.trim();
    if (!message) return;
    await addDoc(collection(db, 'chatRooms', roomId, 'messages'), {
      roomId,
      userId: user.uid,
      username: user.name,
      photoURL: user.photoURL,
      text: message,
      createdAt: new Date().toISOString(),
    });
  }
}
