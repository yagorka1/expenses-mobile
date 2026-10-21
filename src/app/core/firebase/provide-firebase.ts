import { EnvironmentProviders, inject, makeEnvironmentProviders } from '@angular/core';
import { FirebaseOptions, initializeApp } from 'firebase/app';
import { browserPopupRedirectResolver, indexedDBLocalPersistence, initializeAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { FIREBASE_APP, FIREBASE_AUTH, FIRESTORE } from './firebase.tokens';

export function provideFirebase(options: FirebaseOptions): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: FIREBASE_APP, useFactory: () => initializeApp(options) },
    {
      provide: FIREBASE_AUTH,
      // IndexedDB persistence keeps the session across PWA restarts, including offline starts.
      // The resolver enables popup/redirect sign-in (Google).
      useFactory: () =>
        initializeAuth(inject(FIREBASE_APP), {
          persistence: indexedDBLocalPersistence,
          popupRedirectResolver: browserPopupRedirectResolver,
        }),
    },
    {
      provide: FIRESTORE,
      // Persistent cache = offline reads + queued offline writes that sync automatically.
      useFactory: () =>
        initializeFirestore(inject(FIREBASE_APP), {
          localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
        }),
    },
  ]);
}
