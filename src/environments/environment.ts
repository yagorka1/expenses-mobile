import { FirebaseOptions } from 'firebase/app';

/**
 * Firebase web config: Firebase console → Project settings → Your apps → Web app.
 * These values are public identifiers, not secrets; access is enforced by firestore.rules.
 *
 * `authDomain`: once deployed, set it to the Hosting domain (`<project-id>.web.app`) so Google
 * redirect sign-in in the installed PWA stays same-origin (Safari blocks the cross-site variant).
 */
export const environment: { firebase: FirebaseOptions } = {
  firebase: {
    apiKey: 'REPLACE_ME',
    authDomain: 'REPLACE_ME.firebaseapp.com',
    projectId: 'REPLACE_ME',
    storageBucket: 'REPLACE_ME.firebasestorage.app',
    messagingSenderId: 'REPLACE_ME',
    appId: 'REPLACE_ME',
  },
};
