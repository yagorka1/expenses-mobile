import { Injectable, computed, inject, signal } from '@angular/core';
import { User, onAuthStateChanged, signInWithEmailAndPassword } from 'firebase/auth';
import { FAMILY_ACCOUNT_EMAIL } from '../constants/auth.constants';
import { FIREBASE_AUTH } from '../firebase/firebase.tokens';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly auth = inject(FIREBASE_AUTH);
  private readonly currentUser = signal<User | null>(this.auth.currentUser);

  readonly isAuthenticated = computed(() => this.currentUser() !== null);

  constructor() {
    onAuthStateChanged(this.auth, (user) => this.currentUser.set(user));
  }

  /** Resolves once Firebase has restored the persisted session (works offline too). */
  async ready(): Promise<void> {
    await this.auth.authStateReady();
    this.currentUser.set(this.auth.currentUser);
  }

  /** Signs in to the shared family account; the session then persists on this device. */
  async unlock(password: string): Promise<void> {
    const { user } = await signInWithEmailAndPassword(this.auth, FAMILY_ACCOUNT_EMAIL, password);
    this.currentUser.set(user);
  }

  /** Expenses record who wrote them; with a shared account that's the account uid. */
  get userId(): string | null {
    return this.currentUser()?.uid ?? null;
  }
}
