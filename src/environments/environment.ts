import { FirebaseOptions } from 'firebase/app';

/**
 * Firebase web config: Firebase console → Project settings → Your apps → Web app.
 * These values are public identifiers, not secrets; access is enforced by firestore.rules.
 */
export const environment: { firebase: FirebaseOptions } = {
  firebase: {
    apiKey: 'AIzaSyACEe3bmgpM4RvLphALd62tnFoBiRLES0U',
    authDomain: 'expenses-8231a.firebaseapp.com',
    projectId: 'expenses-8231a',
    storageBucket: 'expenses-8231a.firebasestorage.app',
    messagingSenderId: '1092048085293',
    appId: '1:1092048085293:web:09339a57f2a9f719eef3a4',
  },
};
