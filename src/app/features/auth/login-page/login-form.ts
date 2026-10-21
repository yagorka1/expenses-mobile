import { minLength, required, schema } from '@angular/forms/signals';
import { PASSWORD_MIN_LENGTH } from '../../../core/constants/auth.constants';
import { VALIDATION_MESSAGES } from '../../../core/constants/messages';

export interface LoginFormModel {
  password: string;
}

export const INITIAL_LOGIN_FORM: LoginFormModel = { password: '' };

export const loginFormSchema = schema<LoginFormModel>((path) => {
  required(path.password, { message: VALIDATION_MESSAGES.passwordRequired });
  minLength(path.password, PASSWORD_MIN_LENGTH, { message: VALIDATION_MESSAGES.passwordTooShort });
});
