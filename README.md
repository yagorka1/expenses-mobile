# expenses-mobile

A PWA for tracking expenses (Android, and iOS via "Add to Home Screen"). It talks to Firebase directly:
Firestore (data, offline cache), Firebase Auth (shared family password), Firebase Hosting.

Angular 22: standalone components, signals, Signal Forms, zoneless.

## Features

- One-screen expense entry; the last used currency and person are remembered.
- Recent expenses grouped by day, and a details screen with amounts in every currency.
- Statistics for the week, month, previous month, year or a custom range, in EUR or RSD: by person and by category with subcategories.
- Adding and renaming categories and subcategories (the admin and `expenses-server` are no longer needed for that).
  Running the migration in `my-expenses-bot` again would bring back the old names from MongoDB.
- An evening reminder at 23:00 if nobody added an expense that day: the bell in the header turns it on for the
  device; it's sent by the Apps Script in `sheet-sync` (see its README).

## Categories

Expenses refer to their category and subcategory by `categoryId` / `subcategoryId` only; the app, the bot and
the sheet sync look the names up in `categories` / `subcategories` (`CategoriesRepository.names`). So renaming
changes one document, works offline and shows up everywhere at once. The rules check that the subcategory of a
new or re-categorized expense exists and belongs to its category, and don't allow deleting categories.

Subcategories are named after the articles of the budget spreadsheet (`categories-restructure.md`): the sheet sync
writes the subcategory name as the article, so a new or renamed subcategory needs the same row in the sheet.

Older expenses also carry `categoryName` / `subcategoryName` copies. They're only a fallback for an expense whose
ids can't be matched, the app removes them when such an expense is edited, and
`npm run normalize-categories` in `my-expenses-bot` repairs the ids and removes them everywhere at once.
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
npm test         # unit tests (Vitest)
```

Reference data (people, currencies, fallback rates) lives in `src/app/core/constants`.

Exchange rates come from [fawazahmed0/exchange-api](https://github.com/fawazahmed0/exchange-api) (jsDelivr plus the pages.dev mirror).
Each expense is converted with the rates of its own date (the API has them since 2 March 2024; today and older dates
use the latest rates). The latest rates are cached for 12 hours, past days' rates indefinitely, and the form loads
the rates of the picked day in advance.

Saving never waits for the network. If the day's rates aren't loaded yet, the amounts are computed with stand-in rates
and `ratesDate` is `null`; such expenses are re-converted automatically as soon as the rates can be loaded (on start,
when the network comes back and right after saving). Otherwise `ratesDate` holds the day of the rates.

App expenses are stored at noon of their day, so a time zone change never moves them to another day; the expenses
of one day are listed by `createdAt`, the last added first.
