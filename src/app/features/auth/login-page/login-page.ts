import { Component, inject, signal } from '@angular/core';
import { FormField, FormRoot, form } from '@angular/forms/signals';
import { Router } from '@angular/router';
import { ROUTE_LINKS } from '../../../core/constants/app-routes';
import { AuthService } from '../../../core/services/auth.service';
import { getAuthErrorMessage } from '../../../core/utils/firebase-error.utils';
import { FieldError } from '../../../shared/components/field-error/field-error';
import { INITIAL_LOGIN_FORM, LoginFormModel, loginFormSchema } from './login-form';

/** Shown once per device: the family password unlocks the app, the session then persists. */
@Component({
  selector: 'app-login-page',
  imports: [FormField, FormRoot, FieldError],
  templateUrl: './login-page.html',
  styleUrl: './login-page.scss',
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly model = signal<LoginFormModel>({ ...INITIAL_LOGIN_FORM });
  protected readonly loginForm = form(this.model, loginFormSchema, {
    submission: { action: () => this.unlock() },
  });
  protected readonly errorMessage = signal<string | null>(null);

  private async unlock(): Promise<undefined> {
    this.errorMessage.set(null);
    try {
      await this.auth.unlock(this.model().password);
      await this.router.navigateByUrl(ROUTE_LINKS.addExpense);
    } catch (error) {
      this.errorMessage.set(getAuthErrorMessage(error));
    }
    return undefined;
  }
}
