# expenses-mobile

PWA для учёта трат (Android и iOS через «Добавить на главный экран»). Работает напрямую с Firebase:
Firestore (данные, офлайн-кэш), Firebase Auth (семейный пароль), Firebase Hosting.

Angular 22: standalone-компоненты, signals, Signal Forms, zoneless.

Прод: <https://expenses-8231a.web.app>

## Возможности

- Ввод траты на одном экране; последние валюта и человек запоминаются.
- Последние траты по дням и экран деталей с суммами во всех валютах.
- Статистика за неделю, месяц, прошлый месяц и год в EUR или RSD: по людям и по категориям с подкатегориями.
- Офлайн: траты сохраняются на телефоне и отправляются сами, когда появляется сеть.

## Доступ

Вся семья пользуется одним аккаунтом Firebase Auth `family@expenses.app` (см. `core/constants/auth.constants.ts`).
При первом запуске на телефоне приложение просит пароль, дальше сессия хранится на устройстве.

- `firestore.rules` пускают только uid из коллекции `members` — туда добавлен семейный аккаунт
  (`npm run add-member -- family@expenses.app` в `my-expenses-bot`).
- Сменить пароль: Firebase console → Authentication → Users → ⋮ → Reset password.
  После смены оба телефона попросят новый.

## Настройка Firebase с нуля

1. Создать проект, **Firestore Database** (production, `eur3`).
2. **Authentication** → Sign-in method → **Email/Password**; в Users добавить `family@expenses.app`.
3. Web-конфиг проекта — в `src/environments/environment.ts`, id проекта — в `.firebaserc`.
4. Перенос данных из MongoDB и выдача доступа — см. README в `my-expenses-bot`.

## Деплой

```bash
npx firebase-tools login
npm run build
npx firebase-tools deploy --only firestore:rules,hosting
```

## Установка на телефон

- **iPhone**: открыть ссылку в Safari → «Поделиться» → «На экран Домой».
- **Android**: открыть в Chrome → меню → «Установить приложение».

## Разработка

```bash
npm start        # http://localhost:4200 (service worker отключён в dev)
npm run build    # dist/expenses-mobile/browser
```

Справочники (люди, валюты, запасные курсы) лежат в `src/app/core/constants`.
Курсы всех валют берутся из [fawazahmed0/exchange-api](https://github.com/fawazahmed0/exchange-api) (jsDelivr + зеркало на pages.dev) и кэшируются на 12 часов.
