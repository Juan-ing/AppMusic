import { Injectable } from '@angular/core';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import { app, auth, db } from '../../firebase/config';
import { AuthService, type AppUserProfile } from './auth.service';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  constructor(private readonly authService: AuthService) {}

  async updateDetails(name: string, username: string): Promise<void> {
    const user = auth.currentUser;
    const profile = this.authService.profile();
    if (!user || !profile) throw new Error('Debes iniciar sesión para editar tu perfil.');
    if (!name.trim() || !username.trim()) {
      throw new Error('El nombre y el usuario son obligatorios.');
    }
    const updated: AppUserProfile = { ...profile, name: name.trim(), username: username.trim() };
    await Promise.all([
      updateProfile(user, { displayName: updated.name }),
      updateDoc(doc(db, 'users', user.uid), { name: updated.name, username: updated.username }),
    ]);
    this.authService.profile.set(updated);
  }

  async uploadPhoto(file: File): Promise<void> {
    const user = auth.currentUser;
    const profile = this.authService.profile();
    if (!user || !profile) throw new Error('Debes iniciar sesión para cambiar tu foto.');
    if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) {
      throw new Error('Selecciona una imagen de hasta 5 MB.');
    }
    const storage = getStorage(app);
    const photoRef = ref(storage, `users/${user.uid}/profile`);
    await uploadBytes(photoRef, file);
    const photoURL = await getDownloadURL(photoRef);
    await Promise.all([
      updateProfile(user, { photoURL }),
      updateDoc(doc(db, 'users', user.uid), { photoURL }),
    ]);
    this.authService.profile.set({ ...profile, photoURL });
  }
}
