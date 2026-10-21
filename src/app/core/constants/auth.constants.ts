/**
 * The whole family shares one Firebase Auth account; people only type its password, once per device.
 * Create it in Firebase console → Authentication → Users with exactly this email.
 */
export const FAMILY_ACCOUNT_EMAIL = 'family@expenses.app';

/** Firebase Auth's minimum password length. */
export const PASSWORD_MIN_LENGTH = 6;
