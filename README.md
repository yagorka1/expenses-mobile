# expenses-mobile

A PWA for tracking expenses (Android, and iOS via "Add to Home Screen"). It talks to Firebase directly:
Firestore (data, offline cache), Firebase Auth (shared family password), Firebase Hosting.

Angular 22: standalone components, signals, Signal Forms, zoneless.

## Features

- One-screen expense entry; the last used currency and person are remembered.
- Recent expenses grouped by day, and a details screen with amounts in every currency.
- Statistics for the week, month, previous month, year or a custom range, in EUR or RSD: by person and by category with subcategories.
- Offline: expenses are stored on the phone and synced automatically once the network is back.

## Access

The whole family shares one Firebase Auth account (see `core/constants/auth.constants.ts`).
On first launch the app asks for the password; after that the session persists on the device.

- `firestore.rules` only let in uids listed in the `members` collection; the family account is added there
  with `npm run add-member -- <email>` in `my-expenses-bot`.
- Changing the password: Firebase console → Authentication → Users → ⋮ → Reset password.
  Every device will then ask for the new one.

## Firebase setup from scratch

1. Create a project and a **Firestore Database** (production mode, `eur3`).
2. **Authentication** → Sign-in method → **Email/Password**; add the family account under Users.
3. Put the project's web config into `src/environments/environment.ts` and the project id into `.firebaserc`.
4. Migrating data from MongoDB and granting access: see the README in `my-expenses-bot`.

## Deploy

```bash
npx firebase-tools login
npm run build
npx firebase-tools deploy --only firestore,hosting
```

`firestore` deploys both the rules and the composite indexes from `firestore.indexes.json`. Without the indexes,
the person and category filters fail in production with `failed-precondition`. A new index takes a few minutes
to build after deploying.

## Installing on a phone

- **iPhone**: open the link in Safari → Share → Add to Home Screen.
- **Android**: open it in Chrome → menu → Install app.

## Development

```bash
npm start        # http://localhost:4200 (the service worker is disabled in dev)
npm run build    # dist/expenses-mobile/browser
```

Reference data (people, currencies, fallback rates) lives in `src/app/core/constants`.

Exchange rates come from [fawazahmed0/exchange-api](https://github.com/fawazahmed0/exchange-api) (jsDelivr plus the pages.dev mirror).
Each expense is converted with the rates of its own date (the API has them since March 2024; older dates use the latest rates).
The latest rates are cached for 12 hours, past days' rates indefinitely. The day of the rates is stored in the `ratesDate` field;
`null` there means there was neither network nor cache and the built-in fallback rates were used, so the expense
is reconverted the next time it's edited.
