# sheet-sync

Mirrors the app's expenses into the budget spreadsheet (sheet "Расходы факт"). It's an Apps Script that lives
inside the spreadsheet, so it needs no billing and no server. Sync is one-way: Firestore → sheet.

- New expenses are appended, edited ones are updated, deleted ones are removed.
- Matching is by the expense id in column **N** (added by the script). Rows without an id are never touched.
- The sheet alternates two row fills set cell by cell. After each sync the two hand-entered rows above the first
  app row are tiled over the rest of the sheet, so appended and deleted rows don't break the pattern.
- Rows with an id are owned by the app: edit them in the app, manual edits in the sheet are overwritten.
- The totals in RSD and EUR come from the app (`amounts`: converted with the rates of the expense's own day) and are
  written as values. If an expense has no conversion, the sheet's formula stays. The rate columns (H–J) remain the
  sheet's formulas and are informational: the totals no longer use them.
- The other computed columns (month, rates) are copied from the last row as formulas. If the month isn't a formula
  there, the script writes it as a value.

## Setup

1. Open the spreadsheet → Extensions → Apps Script.
2. Project settings → tick "Show appsscript.json manifest file", then replace its content with `appsscript.json`
   (keep `timeZone` equal to the spreadsheet's: File → Settings).
3. Replace the content of `Code.gs` with this folder's `Code.gs`, and add a script file `Reminder` with the content
   of `Reminder.gs` (the evening reminder, see below; it uses the helpers of `Code.gs`).
4. Project settings → Script properties:

   | Property              | Value                                                                  |
   | --------------------- | ---------------------------------------------------------------------- |
   | `FIREBASE_API_KEY`    | `apiKey` from `src/environments/environment.ts`                        |
   | `FIREBASE_PROJECT_ID` | `projectId` from the same file                                         |
   | `FAMILY_EMAIL`        | `FAMILY_ACCOUNT_EMAIL` from `core/constants/auth.constants.ts`         |
   | `FAMILY_PASSWORD`     | the family password (the one the app asks for)                         |
   | `SYNC_FROM`           | `YYYY-MM-DD`: only expenses **created** from this day on are synced    |

5. Reload the spreadsheet: the **Расходы** menu appears. Run "Синхронизировать с приложением" and grant access once.
6. Optional: run `installDailyTrigger` once in the editor to also sync every morning.

The script signs in as the family account, so the Firestore rules apply to it (read access of a member).
If the sign-in fails with an API key error, the key is restricted to HTTP referrers: allow the Identity Toolkit
and Firestore APIs without that restriction, or use another key.

## Evening reminder

`Reminder.gs` pushes "Траты за сегодня" at 23:00 (±15 minutes, the time zone of `appsscript.json`) to every device
that turned the reminder on with the bell in the app's header, unless an expense was **added** that day (by anyone,
in the app or the bot). The devices' FCM tokens are kept in the `pushDevices` collection; the ones FCM no longer
knows (the app was removed, notifications turned off) are deleted by the script.

1. Firebase console → Project settings → Cloud Messaging → Web Push certificates → Generate key pair. Put the public
   key into `vapidKey` in `src/environments/environment.ts`, then build and deploy the app (with the rules).
2. Firebase console → Project settings → Service accounts → Generate new private key. Paste the whole JSON file into
   a new script property `FCM_SERVICE_ACCOUNT`. It's a secret: it gives admin access to the project.
3. In the app (the installed one on iPhone: Safari doesn't offer push in a browser tab) tap the bell and allow
   notifications.
4. Menu **Расходы** → "Отправить тестовое напоминание": sends it right away, whatever was added today.
5. Run `installReminderTrigger` once in the editor.

If the app's API key is restricted to some APIs, the bell needs the Firebase Installations API and the
FCM Registration API allowed on it.

## Notes

- `SYNC_FROM` decides which rows the script owns. Don't move it later: rows of expenses created before it
  would be treated as deleted. Pick the day after the last expense entered in the sheet by hand.
- An empty answer from Firestore never deletes anything.
- Deleting a row shrinks fixed ranges like `$A$2:$A$1746` in the budget formulas by one; whole-column
  ranges (`A:A`) are not affected. Appended rows count only if they are inside the formulas' ranges.
- The «статья» cell is the current subcategory name, looked up by `subcategoryId` (so renaming a subcategory in the
  app updates the rows on the next sync). The budget's articles are named after the app's subcategories, so a new or
  renamed subcategory needs the same row in «Бюджет» (column B), otherwise the dropdown rejects it.

## Renaming the articles (one-off)

`Articles.gs` renames the budget's articles to the app's subcategories (see `categories-restructure.md`): in «Бюджет»
and in every row of «Расходы факт» and «Расходы План», since the budget sums them by name. Do it the same day as
`npm run remap-categories -- --apply` in `my-expenses-bot`.

1. Make a copy of the spreadsheet (File → Make a copy).
2. Add a script file `Articles` with the content of `Articles.gs`, update `Code.gs` (the menu item), reload the sheet.
3. Menu **Расходы** → "Обновить статьи (один раз)". It checks everything first and writes nothing if an old article
   or a listed row isn't found; once done it refuses to run again.
