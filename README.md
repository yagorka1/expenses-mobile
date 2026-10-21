# expenses-mobile

PWA для учёта трат (Android и iOS через «Добавить на главный экран»). Работает напрямую с Firebase:
Firestore (данные, офлайн-кэш), Firebase Auth (вход по email и через Google), Firebase Hosting.

Angular 22: standalone-компоненты, signals, Signal Forms, zoneless.

## Возможности

- Ввод траты на одном экране; последние валюта и человек запоминаются.
- Последние траты по дням и экран деталей с суммами во всех валютах.
- Статистика за неделю, месяц, прошлый месяц и год в EUR или RSD: по людям и по категориям с подкатегориями.
- Офлайн: траты сохраняются на телефоне и отправляются сами, когда появляется сеть.

## Настройка Firebase (один раз)

1. Создать проект на <https://console.firebase.google.com>.
2. **Firestore Database** → Create database (production mode, регион `eur3`).
3. **Authentication** → Sign-in method → включить **Email/Password** и **Google**.
   Во вкладке Users добавить аккаунты с паролем (для входа по email).
   Во вкладке Settings → User actions можно выключить *Enable create (sign-up)*.
4. **Project settings → Your apps → Web app** → скопировать конфиг в `src/environments/environment.ts`.
5. В `.firebaserc` заменить `REPLACE_ME` на id проекта.
6. Перенести данные из MongoDB и выдать доступ — см. README в `my-expenses-bot`
   (`npm run migrate`, затем `npm run add-member -- <email>` для каждого человека).

## Деплой

```bash
npm install -g firebase-tools
firebase login
npm run build
firebase deploy            # хостинг + правила Firestore
```

После первого деплоя:

- в `environment.ts` поставить `authDomain: '<project-id>.web.app'` и задеплоить ещё раз —
  иначе вход через Google в установленной PWA на iOS может не работать;
- в Authentication → Settings → Authorized domains должен быть `<project-id>.web.app`.

## Установка на телефон

- **iPhone**: открыть `https://<project-id>.web.app` в Safari → «Поделиться» → «На экран Домой».
- **Android**: открыть в Chrome → меню → «Установить приложение».

## Доступ

`firestore.rules` пускают только пользователей, чей uid есть в коллекции `members`.
Одного входа недостаточно: с публичным конфигом кто угодно может создать аккаунт.

## Разработка

```bash
npm start        # http://localhost:4200 (service worker отключён в dev)
npm run build    # dist/expenses-mobile/browser
```

Справочники (люди, валюты, курсы RSD/BYN) лежат в `src/app/core/constants`.
Курсы RSD и BYN фиксированные (ECB их не публикует), остальные берутся с frankfurter.app.
