import { Component, effect, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { ROUTE_LINKS } from '../../core/constants/app-routes';
import { AuthService } from '../../core/services/auth.service';
import { NetworkStatusService } from '../../core/services/network-status.service';
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
  protected readonly network = inject(NetworkStatusService);

  constructor() {
    // Covers both the sign-out button and a session revoked elsewhere.
    effect(() => {
      if (!this.auth.isAuthenticated()) {
        void this.router.navigateByUrl(ROUTE_LINKS.login);
      }
    });
  }

  protected signOut(): Promise<void> {
    return this.auth.signOut();
  }
}
