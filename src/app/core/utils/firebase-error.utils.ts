import { FirebaseError } from 'firebase/app';
import {
  AUTH_ERROR_DEFAULT_MESSAGE,
  AUTH_ERROR_MESSAGES,
  DATA_ERROR_DEFAULT_MESSAGE,
  DATA_ERROR_MESSAGES,
  SILENT_AUTH_ERROR_CODES,
} from '../constants/messages';

const errorCode = (error: unknown): string => (error instanceof FirebaseError ? error.code : '');

/** `null` when the user simply cancelled (e.g. closed the Google popup). */
export function getAuthErrorMessage(error: unknown): string | null {
  const code = errorCode(error);
  if (SILENT_AUTH_ERROR_CODES.includes(code)) {
    return null;
  }
  return AUTH_ERROR_MESSAGES[code] ?? AUTH_ERROR_DEFAULT_MESSAGE;
}

export function getDataErrorMessage(error: unknown): string {
  return DATA_ERROR_MESSAGES[errorCode(error)] ?? DATA_ERROR_DEFAULT_MESSAGE;
}
