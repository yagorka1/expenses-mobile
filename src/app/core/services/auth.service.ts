import { DOCUMENT, Injectable, computed, inject, signal } from '@angular/core';
import {
  GoogleAuthProvider,
  User,
  getRedirectResult,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from 'firebase/auth';
import { FIREBASE_AUTH } from '../firebase/firebase.tokens';
import { isStandaloneDisplayMode } from '../utils/display-mode.utils';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly auth = inject(FIREBASE_AUTH);
  private readonly window = inject(DOCUMENT).defaultView;
  private readonly currentUser = signal<User | null>(this.auth.currentUser);

  readonly user = this.currentUser.asReadonly();
  readonly isAuthenticated = computed(() => this.currentUser() !== null);

  constructor() {
    onAuthStateChanged(this.auth, (user) => this.currentUser.set(user));
  }

  /** Resolves once Firebase has restored the persisted session (works offline too). */
  async ready(): Promise<void> {
    await this.auth.authStateReady();
    this.currentUser.set(this.auth.currentUser);
  }

  async signInWithEmail(email: string, password: string): Promise<void> {
    const { user } = await signInWithEmailAndPassword(this.auth, email.trim(), password);
    this.currentUser.set(user);
  }

  /**
   * Popup in a browser tab; redirect in an installed PWA, where popups are unreliable (iOS especially).
   * After a redirect the page reloads and the result is picked up by {@link completeRedirectSignIn}.
   */
  async signInWithGoogle(): Promise<void> {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    if (isStandaloneDisplayMode(this.window)) {
      await signInWithRedirect(this.auth, provider);
      return;
    }
    const { user } = await signInWithPopup(this.auth, provider);
    this.currentUser.set(user);
  }

  /** Returns true if the app was opened by a successful Google redirect; throws its error otherwise. */
  async completeRedirectSignIn(): Promise<boolean> {
    const result = await getRedirectResult(this.auth);
    if (result) {
      this.currentUser.set(result.user);
    }
    return result !== null;
  }

  signOut(): Promise<void> {
    return signOut(this.auth);
  }
}
