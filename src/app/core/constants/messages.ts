export const PAGE_TITLES = {
  login: 'Вход',
  addExpense: 'Новая трата',
  expenses: 'Последние траты',
  expenseDetails: 'Трата',
  statistics: 'Статистика',
} as const;

export const VALIDATION_MESSAGES = {
  amountRequired: 'Введите сумму',
  amountFormat: 'Сумма в формате 123 или 123,45',
  amountPositive: 'Сумма должна быть больше нуля',
  currencyRequired: 'Выберите валюту',
  categoryRequired: 'Выберите категорию',
  subcategoryRequired: 'Выберите подкатегорию',
  dateRequired: 'Выберите дату',
  personRequired: 'Выберите, кто потратил',
  descriptionTooLong: 'Слишком длинное описание',
  emailRequired: 'Введите email',
  emailFormat: 'Некорректный email',
  passwordRequired: 'Введите пароль',
} as const;

export const TOAST_MESSAGES = {
  expenseSaved: 'Трата сохранена',
  expenseQueued: 'Нет сети — трата сохранена на телефоне и отправится позже',
  expenseSyncFailed: 'Не удалось сохранить трату на сервере',
  expenseSaveFailed: 'Не удалось сохранить трату',
} as const;

export const AUTH_ERROR_MESSAGES: Readonly<Record<string, string>> = {
  'auth/invalid-credential': 'Неверный email или пароль',
  'auth/invalid-email': 'Некорректный email',
  'auth/user-disabled': 'Аккаунт отключён',
  'auth/too-many-requests': 'Слишком много попыток, попробуйте позже',
  'auth/network-request-failed': 'Нет соединения с интернетом',
  'auth/popup-blocked': 'Браузер заблокировал окно входа, разрешите всплывающие окна',
  'auth/account-exists-with-different-credential': 'Этот email уже используется для входа по паролю',
  'auth/unauthorized-domain': 'Домен не добавлен в Authorized domains в настройках Firebase',
};

/** User-initiated cancellations: no message is shown. */
export const SILENT_AUTH_ERROR_CODES: readonly string[] = ['auth/popup-closed-by-user', 'auth/cancelled-popup-request'];
export const AUTH_ERROR_DEFAULT_MESSAGE = 'Не удалось войти';

export const DATA_ERROR_MESSAGES: Readonly<Record<string, string>> = {
  'permission-denied': 'Нет доступа к данным. Аккаунт должен быть добавлен в коллекцию members',
  unavailable: 'Сервер недоступен, показаны сохранённые данные',
};
export const DATA_ERROR_DEFAULT_MESSAGE = 'Не удалось загрузить данные';

export const EMPTY_STATE_MESSAGES = {
  expenses: 'Трат пока нет',
  statistics: 'За этот период трат нет',
  categories: 'Категорий нет — добавьте их в админке',
  expenseNotFound: 'Трата не найдена',
} as const;
