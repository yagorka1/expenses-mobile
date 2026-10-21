import { FirebaseError } from 'firebase/app';
import {
  AUTH_ERROR_DEFAULT_MESSAGE,
  AUTH_ERROR_MESSAGES,
  DATA_ERROR_DEFAULT_MESSAGE,
  DATA_ERROR_MESSAGES,
} from '../constants/messages';

const errorCode = (error: unknown): string => (error instanceof FirebaseError ? error.code : '');

export function getAuthErrorMessage(error: unknown): string {
  return AUTH_ERROR_MESSAGES[errorCode(error)] ?? AUTH_ERROR_DEFAULT_MESSAGE;
}

export function getDataErrorMessage(error: unknown): string {
  return DATA_ERROR_MESSAGES[errorCode(error)] ?? DATA_ERROR_DEFAULT_MESSAGE;
}
