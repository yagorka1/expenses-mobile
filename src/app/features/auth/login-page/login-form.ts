import { email, required, schema } from '@angular/forms/signals';
import { VALIDATION_MESSAGES } from '../../../core/constants/messages';

export interface LoginFormModel {
  email: string;
  password: string;
}

export const INITIAL_LOGIN_FORM: LoginFormModel = { email: '', password: '' };

export const loginFormSchema = schema<LoginFormModel>((path) => {
  required(path.email, { message: VALIDATION_MESSAGES.emailRequired });
  email(path.email, { message: VALIDATION_MESSAGES.emailFormat });
  required(path.password, { message: VALIDATION_MESSAGES.passwordRequired });
});
