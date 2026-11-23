import { Injectable, signal } from '@angular/core';
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase/config';

export interface AppUserProfile {
  uid: string;
  name: string;
  username: string;
  email: string;
  photoURL: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly user = signal<User | null>(null);
  readonly profile = signal<AppUserProfile | null>(null);
  readonly loading = signal(true);
  private initialAuthResolve?: (user: User | null) => void;
  private readonly initialAuth = new Promise<User | null>((resolve) => {
    this.initialAuthResolve = resolve;
  });

  constructor() {
    if (!auth || !db) {
      this.loading.set(false);
      this.initialAuthResolve?.(null);
      return;
    }

    const firebaseAuth = auth;
    const firestore = db;
    onAuthStateChanged(firebaseAuth, async (user) => {
      this.user.set(user);
      if (user) {
        const profileRef = doc(firestore, 'users', user.uid);
        const snapshot = await getDoc(profileRef);
        if (snapshot.exists()) {
          this.profile.set(snapshot.data() as AppUserProfile);
        } else {
          const fallback: AppUserProfile = {
            uid: user.uid,
            name: user.displayName ?? 'Usuario',
            username: (user.email ?? 'usuario').split('@')[0],
            email: user.email ?? '',
            photoURL: user.photoURL ?? '',
            createdAt: new Date().toISOString(),
          };
          await setDoc(profileRef, fallback);
          this.profile.set(fallback);
        }
      } else {
        this.profile.set(null);
      }
      this.loading.set(false);
      this.initialAuthResolve?.(user);
    });
  }

  waitForInitialAuth(): Promise<User | null> {
    return this.initialAuth;
  }

  async login(email: string, password: string) {
    if (!auth) throw { code: 'auth/configuration-not-found' };
    return signInWithEmailAndPassword(auth, email, password);
  }

  async register(name: string, username: string, email: string, password: string) {
    if (!auth || !db) throw { code: 'auth/configuration-not-found' };
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const profile: AppUserProfile = {
      uid: credential.user.uid,
      name,
      username,
      email,
      photoURL: credential.user.photoURL ?? '',
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'users', credential.user.uid), profile);
    this.profile.set(profile);
    return credential.user;
  }

  async loginWithGoogle() {
    if (!auth || !db) throw { code: 'auth/configuration-not-found' };
    const credential = await signInWithPopup(auth, new GoogleAuthProvider());
    const profileRef = doc(db, 'users', credential.user.uid);
    const snapshot = await getDoc(profileRef);
    if (!snapshot.exists()) {
      const profile: AppUserProfile = {
        uid: credential.user.uid,
        name: credential.user.displayName ?? 'Usuario',
        username: (credential.user.email ?? 'usuario').split('@')[0],
        email: credential.user.email ?? '',
        photoURL: credential.user.photoURL ?? '',
        createdAt: new Date().toISOString(),
      };
      await setDoc(profileRef, profile);
    }
  }

  async resetPassword(email: string) {
    if (!auth) throw { code: 'auth/configuration-not-found' };
    await sendPasswordResetEmail(auth, email);
  }

  async logout() {
    if (!auth) return;
    await signOut(auth);
  }

  getErrorMessage(error: unknown): string {
    const code = (error as { code?: string }).code ?? '';
    const messages: Record<string, string> = {
      'auth/invalid-email': 'El correo electrónico no es válido.',
      'auth/user-disabled': 'Esta cuenta ha sido deshabilitada.',
      'auth/user-not-found': 'No existe una cuenta con este correo.',
      'auth/wrong-password': 'La contraseña no es correcta.',
      'auth/invalid-credential': 'El correo o la contraseña no son correctos.',
      'auth/email-already-in-use': 'Ya existe una cuenta con este correo.',
      'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
      'auth/popup-closed-by-user': 'Inicio de sesión con Google cancelado.',
      'auth/popup-blocked': 'El navegador bloqueó la ventana de Google.',
      'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos.',
      'auth/configuration-not-found': 'Firebase no está configurado. Completa las variables de entorno.',
    };
    return messages[code] ?? 'Ocurrió un error. Inténtalo nuevamente.';
  }
}
