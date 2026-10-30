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
3. Replace the content of `Code.gs` with this folder's `Code.gs`.
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

## Notes

- `SYNC_FROM` decides which rows the script owns. Don't move it later: rows of expenses created before it
  would be treated as deleted. Pick the day after the last expense entered in the sheet by hand.
- An empty answer from Firestore never deletes anything.
- Deleting a row shrinks fixed ranges like `$A$2:$A$1746` in the budget formulas by one; whole-column
  ranges (`A:A`) are not affected. Appended rows count only if they are inside the formulas' ranges.
- The «статья» cell is the current subcategory name, looked up by `subcategoryId` (so renaming a subcategory in the
  app updates the rows on the next sync); see `articleFor` in `Code.gs` once the mapping is decided.
