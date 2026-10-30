import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import { collection, deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { FIRESTORE_COLLECTIONS } from '../constants/firestore.constants';
import { STORAGE_KEYS } from '../constants/storage-keys';
import { FIREBASE_APP, FIRESTORE, PUSH_VAPID_KEY } from '../firebase/firebase.tokens';
import { AuthService } from './auth.service';
import { StorageService } from './storage.service';

/**
 * The evening reminder, sent by the Apps Script in `sheet-sync` when nobody added an expense that day.
 * A device that turns it on keeps its FCM token in `pushDevices/{deviceId}`. The push is shown by the
 * Angular service worker (FCM subscribes on its registration), so there's no second worker.
 * Firebase Messaging is loaded only here, on demand.
 */
@Injectable({ providedIn: 'root' })
export class ReminderService {
  private readonly app = inject(FIREBASE_APP);
  private readonly db = inject(FIRESTORE);
  private readonly auth = inject(AuthService);
  private readonly storage = inject(StorageService);
  private readonly vapidKey = inject(PUSH_VAPID_KEY);
  private readonly swEnabled = inject(SwPush).isEnabled;
  private readonly devicesRef = collection(this.db, FIRESTORE_COLLECTIONS.pushDevices);
  private readonly deviceId = signal(this.storage.get<string>(STORAGE_KEYS.pushDeviceId));
  private readonly isSupported = signal(false);
  private readonly isBusy = signal(false);

  /** False in dev (no service worker), without a VAPID key and on iOS outside the installed app. */
  readonly supported = this.isSupported.asReadonly();
  readonly enabled = computed(() => this.deviceId() !== null);
  readonly busy = this.isBusy.asReadonly();

  constructor() {
    void this.detectSupport();
    // FCM tokens change from time to time, so the stored one is refreshed on every start.
    effect(() => {
      if (this.auth.isAuthenticated() && this.supported()) {
        untracked(() => void this.refresh());
      }
    });
  }

  /** Must be called from a tap: iOS asks for the permission only then. `false` when it's denied. */
  async enable(): Promise<boolean> {
    this.isBusy.set(true);
    try {
      if ((await Notification.requestPermission()) !== 'granted') {
        return false;
      }
      const deviceId = this.deviceId() ?? doc(this.devicesRef).id;
      await this.saveToken(deviceId);
      this.storage.set(STORAGE_KEYS.pushDeviceId, deviceId);
      this.deviceId.set(deviceId);
      return true;
    } finally {
      this.isBusy.set(false);
    }
  }

  async disable(): Promise<void> {
    const deviceId = this.deviceId();
    if (!deviceId) {
      return;
    }
    this.isBusy.set(true);
    // Deleting the document is what stops the reminders; offline it's queued and synced later.
    void deleteDoc(doc(this.devicesRef, deviceId)).catch(() => undefined);
    this.storage.remove(STORAGE_KEYS.pushDeviceId);
    this.deviceId.set(null);
    try {
      const { deleteToken, getMessaging } = await import('firebase/messaging');
      await deleteToken(getMessaging(this.app));
    } catch {
      // Offline: the token is left with FCM, but nothing sends to it any more.
    } finally {
      this.isBusy.set(false);
    }
  }

  private async detectSupport(): Promise<void> {
    if (!this.vapidKey || !this.swEnabled) {
      return;
    }
    const { isSupported } = await import('firebase/messaging');
    this.isSupported.set(await isSupported());
  }

  private async refresh(): Promise<void> {
    const deviceId = this.deviceId();
    if (!deviceId) {
      return;
    }
    if (Notification.permission !== 'granted') {
      // Turned off in the system settings: stop sending to this device.
      await this.disable();
      return;
    }
    // Offline or FCM unavailable: the next start retries.
    await this.saveToken(deviceId).catch(() => undefined);
  }

  private async saveToken(deviceId: string): Promise<void> {
    const { getMessaging, getToken } = await import('firebase/messaging');
    const token = await getToken(getMessaging(this.app), {
      vapidKey: this.vapidKey,
      serviceWorkerRegistration: await navigator.serviceWorker.ready,
    });
    await setDoc(doc(this.devicesRef, deviceId), { token, updatedAt: serverTimestamp() });
  }
}
