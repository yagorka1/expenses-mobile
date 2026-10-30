/**
 * Evening reminder: at 23:00 (the script's time zone, `timeZone` in appsscript.json) pushes a notification
 * to every device that turned it on in the app, unless an expense was added that day. Expenses and devices
 * are read as the family account, like the sync; the pushes go through FCM as the Firebase service account.
 *
 * Setup: see README.md.
 */

const REMINDER = {
  hour: 23,
  devicesCollection: 'pushDevices',
  title: 'Траты за сегодня',
  body: 'Сегодня ещё ничего не внесено — добавьте траты, пока помните',
  /** Opened on tap, relative to the app's root. */
  url: '/add',
  icon: '/icons/icon-192x192.png',
  /** A reminder about today is pointless after midnight: FCM drops it if the phone stays offline that long. */
  ttlSeconds: 3600,
};

const FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

/** Entry point of the trigger. */
function sendReminder() {
  runReminder(false);
}

/** From the menu: sends the reminder right away, even if there are expenses today. */
function sendTestReminder() {
  try {
    runReminder(true);
  } catch (error) {
    notify('Ошибка: ' + error.message);
    throw error;
  }
}

/** Run once from the editor: sends the reminder every evening. */
function installReminderTrigger() {
  ScriptApp.getProjectTriggers()
    .filter((trigger) => trigger.getHandlerFunction() === 'sendReminder')
    .forEach((trigger) => ScriptApp.deleteTrigger(trigger));
  // Time triggers fire within ±15 minutes of the given time.
  ScriptApp.newTrigger('sendReminder').timeBased().everyDays(1).atHour(REMINDER.hour).nearMinute(0).create();
}

function runReminder(force) {
  const properties = readProperties(['FCM_SERVICE_ACCOUNT']);
  const settings = {
    apiKey: properties.FIREBASE_API_KEY,
    projectId: properties.FIREBASE_PROJECT_ID,
    email: properties.FAMILY_EMAIL,
    password: properties.FAMILY_PASSWORD,
  };
  const idToken = signIn(settings);

  if (!force && hasExpensesSince(settings, idToken, startOfToday())) {
    notify('Сегодня траты есть, напоминание не нужно');
    return;
  }
  const devices = fetchDocuments(settings, idToken, REMINDER.devicesCollection, ['token']);
  if (devices.size === 0) {
    notify('Напоминание никто не включил');
    return;
  }

  const accessToken = fcmAccessToken(JSON.parse(properties.FCM_SERVICE_ACCOUNT));
  let sent = 0;
  let removed = 0;
  const failed = [];
  devices.forEach(({ token }, id) => {
    const response = sendPush(settings.projectId, accessToken, token || '');
    if (response.getResponseCode() === 200) {
      sent++;
    } else if (isStaleToken(response)) {
      // The app was removed or the notifications were turned off: FCM won't deliver to it again.
      deleteDevice(settings, idToken, id);
      removed++;
    } else {
      failed.push(id + ': ' + response.getContentText());
    }
  });

  const summary = 'Напоминание отправлено: ' + sent + ', удалено устройств: ' + removed;
  notify(failed.length ? summary + '. Ошибки: ' + failed.join('; ') : summary);
}

function startOfToday() {
  const timeZone = Session.getScriptTimeZone();
  return Utilities.parseDate(Utilities.formatDate(new Date(), timeZone, 'yyyy-MM-dd'), timeZone, 'yyyy-MM-dd');
}

/** Whether any expense was added (not dated) since `from`: entering yesterday's expenses today counts. */
function hasExpensesSince(settings, idToken, from) {
  const response = UrlFetchApp.fetch(documentsUrl(settings) + ':runQuery', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + idToken },
    payload: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: CONFIG.collection }],
        select: { fields: [{ fieldPath: '__name__' }] },
        where: {
          fieldFilter: {
            field: { fieldPath: 'createdAt' },
            op: 'GREATER_THAN_OR_EQUAL',
            value: { timestampValue: from.toISOString() },
          },
        },
        limit: 1,
      },
    }),
    muteHttpExceptions: true,
  });
  if (response.getResponseCode() !== 200) {
    throw new Error('Firestore: ' + response.getContentText());
  }
  return JSON.parse(response.getContentText()).some((result) => result.document);
}

function deleteDevice(settings, idToken, id) {
  const response = UrlFetchApp.fetch(
    documentsUrl(settings) + '/' + REMINDER.devicesCollection + '/' + encodeURIComponent(id),
    { method: 'delete', headers: { Authorization: 'Bearer ' + idToken }, muteHttpExceptions: true },
  );
  if (response.getResponseCode() !== 200) {
    console.log('Не удалось удалить устройство ' + id + ': ' + response.getContentText());
  }
}

// ---- FCM ----

/** An OAuth token of the service account (its JSON key from the Firebase console), signed here as a JWT. */
function fcmAccessToken(account) {
  const tokenUrl = account.token_uri || GOOGLE_TOKEN_URL;
  const now = Math.floor(Date.now() / 1000);
  const unsigned = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' })) + '.' +
    base64Url(JSON.stringify({ iss: account.client_email, scope: FCM_SCOPE, aud: tokenUrl, iat: now, exp: now + 3600 }));
  const signature = base64Url(Utilities.computeRsaSha256Signature(unsigned, account.private_key));
  const response = UrlFetchApp.fetch(tokenUrl, {
    method: 'post',
    payload: { grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: unsigned + '.' + signature },
    muteHttpExceptions: true,
  });
  if (response.getResponseCode() !== 200) {
    throw new Error('Не удалось получить токен сервисного аккаунта: ' + response.getContentText());
  }
  return JSON.parse(response.getContentText()).access_token;
}

function base64Url(data) {
  return Utilities.base64EncodeWebSafe(data).replace(/=+$/, '');
}

/**
 * The notification is shown by the app's Angular service worker: it takes `notification` as the options
 * of `showNotification`, and `data.onActionClick` tells it what to open on tap.
 */
function sendPush(projectId, accessToken, token) {
  return UrlFetchApp.fetch(
    'https://fcm.googleapis.com/v1/projects/' + encodeURIComponent(projectId) + '/messages:send',
    {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + accessToken },
      payload: JSON.stringify({
        message: {
          token,
          webpush: {
            headers: { TTL: String(REMINDER.ttlSeconds), Urgency: 'high' },
            notification: {
              title: REMINDER.title,
              body: REMINDER.body,
              icon: REMINDER.icon,
              // A second reminder replaces the first one instead of piling up.
              tag: 'evening-reminder',
              data: { onActionClick: { default: { operation: 'navigateLastFocusedOrOpen', url: REMINDER.url } } },
            },
          },
        },
      }),
      muteHttpExceptions: true,
    },
  );
}

function isStaleToken(response) {
  if (response.getResponseCode() === 404) {
    return true;
  }
  try {
    const details = JSON.parse(response.getContentText()).error.details || [];
    return details.some((detail) => detail.errorCode === 'UNREGISTERED');
  } catch (error) {
    return false;
  }
}
