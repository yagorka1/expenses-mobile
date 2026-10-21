import { Component, inject, signal } from '@angular/core';
import { FormField, FormRoot, form } from '@angular/forms/signals';
import { Router } from '@angular/router';
import { ROUTE_LINKS } from '../../../core/constants/app-routes';
import { AuthService } from '../../../core/services/auth.service';
import { getAuthErrorMessage } from '../../../core/utils/firebase-error.utils';
import { FieldError } from '../../../shared/components/field-error/field-error';
import { GoogleSignInButton } from '../google-sign-in-button/google-sign-in-button';
import { INITIAL_LOGIN_FORM, LoginFormModel, loginFormSchema } from './login-form';

@Component({
  selector: 'app-login-page',
  imports: [FormField, FormRoot, FieldError, GoogleSignInButton],
  templateUrl: './login-page.html',
  styleUrl: './login-page.scss',
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly credentials = signal<LoginFormModel>({ ...INITIAL_LOGIN_FORM });
  protected readonly loginForm = form(this.credentials, loginFormSchema, {
    submission: { action: () => this.signInWithEmail() },
  });
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly googlePending = signal(false);

  constructor() {
    void this.handleGoogleRedirect();
  }

  protected async signInWithGoogle(): Promise<void> {
    this.googlePending.set(true);
    await this.attempt(() => this.auth.signInWithGoogle());
    this.googlePending.set(false);
  }

  private async signInWithEmail(): Promise<undefined> {
    const { email, password } = this.credentials();
    await this.attempt(() => this.auth.signInWithEmail(email, password));
    return undefined;
  }

  /** Coming back from a Google redirect (installed PWA) lands on this page. */
  private async handleGoogleRedirect(): Promise<void> {
    try {
      if (await this.auth.completeRedirectSignIn()) {
        await this.router.navigateByUrl(ROUTE_LINKS.addExpense);
      }
    } catch (error) {
      this.errorMessage.set(getAuthErrorMessage(error));
    }
  }

  private async attempt(signIn: () => Promise<void>): Promise<void> {
    this.errorMessage.set(null);
    try {
      await signIn();
      if (this.auth.isAuthenticated()) {
        await this.router.navigateByUrl(ROUTE_LINKS.addExpense);
      }
    } catch (error) {
      this.errorMessage.set(getAuthErrorMessage(error));
    }
  }
}
