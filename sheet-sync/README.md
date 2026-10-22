# sheet-sync

Mirrors the app's expenses into the budget spreadsheet (sheet "Расходы факт"). It's an Apps Script that lives
inside the spreadsheet, so it needs no billing and no server. Sync is one-way: Firestore → sheet.

- New expenses are appended, edited ones are updated, deleted ones are removed.
- Matching is by the expense id in column **N** (added by the script). Rows without an id are never touched.
- Rows with an id are owned by the app: edit them in the app, manual edits in the sheet are overwritten.
- Columns the sheet computes itself (month, totals, rates) are copied from the last row as formulas. If they're
  plain values there, the script writes month and totals (RSD, EUR) as values and leaves the rates empty.

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
- The «статья» cell is the subcategory name; see `articleFor` in `Code.gs` once the mapping is decided.
