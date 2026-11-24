import { Injectable, signal } from '@angular/core';
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  setPersistence,
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
  readonly profileError = signal('');
  private initialAuthResolve?: (user: User | null) => void;
  private readonly profileLoads = new Map<string, Promise<AppUserProfile>>();
  private readonly initialAuth = new Promise<User | null>((resolve) => {
    this.initialAuthResolve = resolve;
  });

  constructor() {
    if (!auth || !db) {
      this.loading.set(false);
      this.resolveInitialAuth(null);
      return;
    }

    onAuthStateChanged(auth, (user) => {
      this.user.set(user);
      this.profile.set(null);
      this.profileError.set('');

      if (!user) {
        this.loading.set(false);
        this.resolveInitialAuth(null);
        return;
      }

      this.loading.set(true);
      void this.loadProfile(user).catch(() => {
        if (this.user()?.uid === user.uid) this.profile.set(null);
      }).finally(() => {
        if (this.user()?.uid === user.uid) this.loading.set(false);
        this.resolveInitialAuth(this.profile()?.uid === user.uid ? user : null);
      });
    });
  }

  waitForInitialAuth(): Promise<User | null> {
    return this.initialAuth;
  }

  async login(email: string, password: string, remember = true) {
    if (!auth) throw this.configurationError();
    this.profileError.set('');
    await this.withTimeout(
      setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence),
      'Firebase Authentication',
    );
    const credential = await this.withTimeout(
      signInWithEmailAndPassword(auth, email.trim().toLocaleLowerCase(), password),
      'Firebase Authentication',
    );
    this.user.set(credential.user);
    await this.loadProfile(credential.user);
    return credential;
  }

  async register(name: string, username: string, email: string, password: string) {
    if (!auth || !db) throw this.configurationError();
    const normalizedEmail = email.trim().toLocaleLowerCase();
    const normalizedName = name.trim();
    const normalizedUsername = username.trim();
    const credential = await this.withTimeout(
      createUserWithEmailAndPassword(auth, normalizedEmail, password),
      'Firebase Authentication',
    );
    const profile: AppUserProfile = {
      uid: credential.user.uid,
      name: normalizedName,
      username: normalizedUsername,
      email: normalizedEmail,
      photoURL: credential.user.photoURL ?? '',
      createdAt: new Date().toISOString(),
    };
    try {
      await this.withTimeout(
        setDoc(doc(db, 'users', credential.user.uid), profile),
        'Firestore',
      );
    } catch (error) {
      this.profile.set(null);
      this.profileError.set(this.describeProfileError(error));
      throw Object.assign(
        new Error(`La cuenta ya se creó en Firebase Authentication. No necesitas registrarte de nuevo, pero no se pudo guardar el perfil en Firestore. ${this.profileError()} Después de corregir las reglas, inicia sesión con esta cuenta.`),
        { code: 'app/profile-save-failed' },
      );
    }
    this.user.set(credential.user);
    this.profile.set(profile);
    this.profileError.set('');
    return credential.user;
  }

  async loginWithGoogle() {
    if (!auth) throw this.configurationError();
    this.profileError.set('');
    await this.withTimeout(setPersistence(auth, browserLocalPersistence), 'Firebase Authentication');
    const credential = await this.withTimeout(
      signInWithPopup(auth, new GoogleAuthProvider()),
      'Firebase Authentication',
    );
    this.user.set(credential.user);
    await this.loadProfile(credential.user);
  }

  async resetPassword(email: string) {
    if (!auth) throw this.configurationError();
    await sendPasswordResetEmail(auth, email);
  }

  async logout() {
    if (!auth) return;
    await signOut(auth);
    this.user.set(null);
    this.profile.set(null);
    this.profileError.set('');
  }

  getErrorMessage(error: unknown): string {
    const code = typeof error === 'object' && error !== null && 'code' in error
      && typeof error.code === 'string'
      ? error.code
      : '';
    if (code === 'app/profile-unavailable' && error instanceof Error) return error.message;
    if (code === 'app/profile-save-failed' && error instanceof Error) return error.message;
    if (code === 'app/timeout' && error instanceof Error) return error.message;
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
      'auth/network-request-failed': 'No se pudo conectar con Firebase. Verifica tu conexión a internet.',
      'auth/operation-not-allowed': 'Este método de acceso no está habilitado en Firebase.',
      'auth/unauthorized-domain': 'Este dominio no está autorizado en Firebase Authentication. Agrégalo en Dominios autorizados.',
      'auth/invalid-api-key': 'La configuración de Firebase no tiene una API key válida.',
      'auth/app-not-authorized': 'Esta aplicación web no está autorizada para usar el proyecto Firebase configurado.',
      'auth/configuration-not-found': 'Firebase no está configurado. Completa las variables de entorno.',
    };
    return messages[code] ?? 'Ocurrió un error. Inténtalo nuevamente.';
  }

  private async loadProfile(user: User): Promise<AppUserProfile> {
    if (!db) throw this.configurationError();
    let request = this.profileLoads.get(user.uid);
    if (!request) {
      request = this.withTimeout(this.readOrCreateProfile(user), 'Firestore');
      this.profileLoads.set(user.uid, request);
    }

    try {
      const profile = await request;
      if (this.user()?.uid === user.uid) {
        this.profile.set(profile);
        this.profileError.set('');
      }
      return profile;
    } catch (error) {
      const message = this.describeProfileError(error);
      if (this.user()?.uid === user.uid) {
        this.profile.set(null);
        this.profileError.set(message);
      }
      throw Object.assign(new Error(message), { code: 'app/profile-unavailable' });
    } finally {
      if (this.profileLoads.get(user.uid) === request) this.profileLoads.delete(user.uid);
    }
  }

  private async readOrCreateProfile(user: User): Promise<AppUserProfile> {
    const profileRef = doc(db, 'users', user.uid);
    const accountName = user.displayName?.trim() || user.email?.split('@')[0] || 'Usuario';
    const snapshot = await getDoc(profileRef);
    if (snapshot.exists()) {
      const stored = snapshot.data() as Partial<AppUserProfile>;
      return {
        uid: user.uid,
        name: typeof stored.name === 'string' ? stored.name : accountName,
        username: typeof stored.username === 'string'
          ? stored.username
          : (user.email ?? 'usuario').toLocaleLowerCase().split('@')[0],
        email: typeof stored.email === 'string' ? stored.email : user.email?.toLocaleLowerCase() ?? '',
        photoURL: typeof stored.photoURL === 'string' ? stored.photoURL : user.photoURL ?? '',
        createdAt: typeof stored.createdAt === 'string' ? stored.createdAt : new Date().toISOString(),
      };
    }

    const profile: AppUserProfile = {
      uid: user.uid,
      name: accountName,
      username: (user.email ?? 'usuario').toLocaleLowerCase().split('@')[0],
      email: user.email?.toLocaleLowerCase() ?? '',
      photoURL: user.photoURL ?? '',
      createdAt: new Date().toISOString(),
    };
    await setDoc(profileRef, profile);
    return profile;
  }

  private describeProfileError(error: unknown): string {
    const code = typeof error === 'object' && error !== null && 'code' in error
      && typeof error.code === 'string'
      ? error.code
      : '';
    if (code === 'permission-denied') {
      return 'Firebase validó tu cuenta, pero Firestore no permitió leer o crear users/{uid}. Revisa las reglas de Firestore.';
    }
    if (code === 'unavailable' || code === 'deadline-exceeded') {
      return 'Firebase validó tu cuenta, pero no se pudo conectar con Firestore para cargar tu perfil.';
    }
    if (code === 'app/timeout' && error instanceof Error) return error.message;
    return 'No se pudo cargar o guardar tu perfil real en Firestore. No se iniciará una cuenta de prueba.';
  }

  private withTimeout<T>(operation: Promise<T>, service: string): Promise<T> {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<T>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(Object.assign(
          new Error(`${service} no respondió en 12 segundos. Verifica la conexión y la configuración de Firebase.`),
          { code: 'app/timeout' },
        ));
      }, 12_000);
    });
    return Promise.race([operation, timeout]).finally(() => {
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    });
  }

  private resolveInitialAuth(user: User | null): void {
    const resolve = this.initialAuthResolve;
    this.initialAuthResolve = undefined;
    resolve?.(user);
  }

  private configurationError(): Error & { code: string } {
    return Object.assign(new Error('Firebase no está configurado.'), {
      code: 'auth/configuration-not-found',
    });
  }
}
