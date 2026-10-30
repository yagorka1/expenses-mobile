import { Component, effect, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { ROUTE_LINKS } from '../../core/constants/app-routes';
import { TOAST_MESSAGES } from '../../core/constants/messages';
import { AuthService } from '../../core/services/auth.service';
import { NetworkStatusService } from '../../core/services/network-status.service';
import { ReminderService } from '../../core/services/reminder.service';
import { ToastService } from '../../core/services/toast.service';
import { BottomNav } from '../bottom-nav/bottom-nav';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, BottomNav],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  protected readonly network = inject(NetworkStatusService);
  protected readonly reminder = inject(ReminderService);

  constructor() {
    // The session ends only when the family password is changed in the Firebase console.
    effect(() => {
      if (!this.auth.isAuthenticated()) {
        void this.router.navigateByUrl(ROUTE_LINKS.login);
      }
    });
  }

  protected async toggleReminder(): Promise<void> {
    if (this.reminder.enabled()) {
      await this.reminder.disable();
      this.toast.info(TOAST_MESSAGES.reminderDisabled);
      return;
    }
    try {
      const enabled = await this.reminder.enable();
      if (enabled) {
        this.toast.success(TOAST_MESSAGES.reminderEnabled);
      } else {
        this.toast.error(TOAST_MESSAGES.reminderDenied);
      }
    } catch {
      this.toast.error(TOAST_MESSAGES.reminderFailed);
    }
  }
}
