export const PAGE_TITLES = {
  login: 'Вход',
  addExpense: 'Новая трата',
  expenses: 'Последние траты',
  expenseDetails: 'Трата',
  editExpense: 'Изменение траты',
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
  dateInFuture: 'Дата не может быть в будущем',
  dateTooOld: 'Проверьте год',
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
  expenseCategoryMissing: 'Категории или подкатегории больше нет — выберите другую',
  expenseUpdated: 'Изменения сохранены',
  expenseUpdateQueued: 'Нет сети — изменения сохранены на телефоне и отправятся позже',
  expenseDeleted: 'Трата удалена',
  expenseDeleteQueued: 'Нет сети — трата удалится после подключения',
  expenseDeleteFailed: 'Не удалось удалить трату на сервере',
} as const;

export const CONFIRM_MESSAGES = {
  deleteExpenseTitle: 'Удалить трату?',
  deleteExpenseMessage: 'Отменить удаление будет нельзя',
  deleteExpenseConfirm: 'Удалить',
  cancel: 'Отмена',
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
  'failed-precondition': 'Фильтр ещё готовится на сервере, попробуйте через несколько минут',
};
export const DATA_ERROR_DEFAULT_MESSAGE = 'Не удалось загрузить данные';

export const EMPTY_STATE_MESSAGES = {
  expenses: 'Трат пока нет',
  filteredExpenses: 'Нет трат с такими фильтрами',
  statistics: 'За этот период трат нет',
  categories: 'Категорий нет — добавьте их в админке',
  expenseNotFound: 'Трата не найдена',
} as const;
