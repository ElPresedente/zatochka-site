# CLAUDE.md

Рабочие инструкции для Claude Code / Codex при изменении этого репозитория.

## Команды

```bash
npm run dev          # dev server at http://localhost:3000
npm run build        # production build, обязательно запускать после изменений Nuxt/API
npm run preview      # локальный preview production-сборки

npm run db:generate  # сгенерировать SQL-миграцию после изменения Drizzle schema
npm run db:migrate   # применить migration files
npm run db:push      # синхронизировать schema напрямую, только для локальной разработки
npm run db:seed      # заполнить базовые данные + первого админа из env
npm run db:seed-admin # создать/обновить первого админа из env
npm run db:studio    # Drizzle Studio
```

Первый запуск: скопировать `.env.example` в `.env`, задать `DATABASE_URL`, безопасный `SESSION_SECRET`, `ADMIN_PHONE`, `ADMIN_PASSWORD`, затем установить зависимости и применить миграции.

## Стек

- Nuxt 3 SSR, Vue 3, TypeScript.
- Tailwind CSS, глобальные стили в `assets/css/main.css`.
- PostgreSQL через Drizzle ORM.
- Server API routes в `server/api/**`.
- Сессии через `useSession` и signed httpOnly cookie `sid`.

## Архитектура

Основной поток данных:

```text
page/component -> useFetch/$fetch -> /api/* -> useDb() -> PostgreSQL
```

`useDb()` находится в `server/db/index.ts`, использует `DATABASE_URL` из `runtimeConfig`. Все таблицы описаны в `server/db/schema/` и экспортируются из `server/db/schema/index.ts`.

## Авторизация

- Пользователи: `users`.
- Админы: отдельная таблица `admins`, связанная с `users`.
- Сессия: `server/utils/session.ts`.
- `SESSION_SECRET` должен быть не короче 32 символов и не равен дефолтному значению.
- Публичные auth endpoints: `server/api/auth/*`.
- Общий same-origin guard для небезопасных auth/order запросов: `server/middleware/same-origin.ts`.
- Админские API защищены server middleware `server/middleware/admin-auth.ts`.
- Клиентская защита `/admin/**`: `middleware/admin.global.ts`.
- В SSR-запросах к `/api/auth/me` нужно использовать `useRequestFetch()`, иначе cookie пользователя может не попасть в server-side fetch.

## Основные страницы

| Page | Назначение |
|---|---|
| `/` | Главная |
| `/services` | Прайс услуг |
| `/gallery` | Галерея |
| `/about` | О мастерской |
| `/shop` | Магазин, корзина, создание заказов |
| `/login` | Публичная авторизация |
| `/register` | Регистрация |
| `/admin` | Дашборд |
| `/admin/orders` | Обработка заказов |
| `/admin/products` | Товары магазина |
| `/admin/users` | Пользователи и права админа |
| `/admin/gallery`, `/admin/prices`, `/admin/workers`, `/admin/contacts` | Остальные разделы админки |

## Заказы

Таблицы:

- `orders` — заказ, клиентские данные на момент заказа, сумма, статус, комментарий клиента, комментарий продавца.
- `order_items` — снимок состава заказа: товар, название, фото, цена, количество, сумма строки.

Создание заказа:

- Endpoint: `POST /api/orders`.
- Требует авторизованного пользователя.
- Сохраняет текущую корзину, комментарий пользователя и сумму на момент заказа.
- Уведомление пока заглушка: `server/utils/order-notifications.ts`; позже заменить на Telegram.

Статусы:

```text
created -> accepted -> in_progress -> ready -> completed
created -> cancelled
accepted/in_progress/ready -> cancelled
```

При переходе `created -> accepted` остатки товаров списываются в транзакции. При отмене после `accepted`, `in_progress` или `ready` остатки возвращаются. `cancelled` и `completed` финальные.

Сумму заказа админ может менять только в статусах `created` и `in_progress`. Если сумма меняется, комментарий продавца обязателен. Правило должно сохраняться на сервере, не только в UI.

## Миграции

Для изменения схемы:

1. Обновить `server/db/schema/*`.
2. Создать migration file через `npm run db:generate` или вручную, если нужно контролировать existing DB.
3. Проверить, что миграция не пересоздает уже существующие таблицы.
4. Обновить `server/db/migrations/meta/_journal.json`, если migration file создан вручную.
5. Запустить `npm run build`.

В этом проекте первая миграция создавалась на уже существующую базу, поэтому `0000_perfect_namorita.sql` намеренно сделана инкрементальной и использует `IF NOT EXISTS`.

## Стиль правок

- Следовать существующим паттернам Nuxt pages + server API.
- Для ручных правок использовать `apply_patch`.
- Не откатывать чужие изменения в dirty worktree.
- После изменений в Nuxt/API запускать `npm run build`.
- Не хранить секреты в репозитории.
- При добавлении write endpoints под `/api/admin/**` полагаться на `admin-auth` middleware, но всё равно валидировать входные данные в endpoint.
- Публичные write endpoints должны проверять авторизацию и same-origin, если используют cookie session.

## Важные env-переменные

- `DATABASE_URL` — PostgreSQL connection string.
- `SESSION_SECRET` — секрет подписи cookie, минимум 32 символа.
- `ADMIN_PHONE` — телефон первого администратора для seed.
- `ADMIN_PASSWORD` — пароль первого администратора для seed.
