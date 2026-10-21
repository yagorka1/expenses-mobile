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
  passwordRequired: 'Введите пароль',
  passwordTooShort: 'Пароль не короче 6 символов',
} as const;

export const TOAST_MESSAGES = {
  expenseSaved: 'Трата сохранена',
  expenseQueued: 'Нет сети — трата сохранена на телефоне и отправится позже',
  expenseSyncFailed: 'Не удалось сохранить трату на сервере',
  expenseSaveFailed: 'Не удалось сохранить трату',
} as const;

export const AUTH_ERROR_MESSAGES: Readonly<Record<string, string>> = {
  'auth/invalid-credential': 'Неверный пароль',
  'auth/wrong-password': 'Неверный пароль',
  'auth/user-not-found': 'Семейный аккаунт не создан в Firebase',
  'auth/user-disabled': 'Доступ отключён',
  'auth/too-many-requests': 'Слишком много попыток, попробуйте позже',
  'auth/network-request-failed': 'Нет соединения с интернетом',
};
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
