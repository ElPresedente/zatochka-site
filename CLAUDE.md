# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Рабочие инструкции для Claude Code при изменении этого репозитория.

## Требования

- Node.js 20+ (рекомендуется 22 LTS).
- PostgreSQL 16+.

## Команды

```bash
npm run dev          # dev server at http://localhost:3000
npm run dev:lan      # dev server, доступный по локальной сети (0.0.0.0)
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

Общие типы DTO (ProductDto, OrderDetailsDto, ORDER_STATUS_LABELS и т.д.) — в `types/api.ts`. Использовать их вместо inline-типов.

Composables:
- `useAuth()` — состояние авторизации, login/logout. На сервере использует `useRequestFetch()`, на клиенте — `$fetch`.
- `useCart()` — корзина в `localStorage` под ключом `ostriy_kray_cart`. CartItem идентифицируется `cartKey = "productId"` или `"productId:svcId1,svcId2"` (с привязанными услугами).
- `useFormatters()` — форматирование цен, дат и т.п.

## Авторизация

- Пользователи: `users` (телефон + хэш пароля).
- Админы: отдельная таблица `admins`, связанная с `users` (userId PK, onDelete cascade).
- Сессия: `server/utils/session.ts`, cookie `sid`, 7 дней, httpOnly, sameSite: lax, secure по протоколу.
- `SESSION_SECRET` должен быть не короче 32 символов; приложение падает на старте, если секрет дефолтный.
- Публичные auth endpoints: `server/api/auth/*`.
- `server/middleware/same-origin.ts` — same-origin guard для всех небезопасных методов (POST/PUT/PATCH/DELETE) на `/api/**`.
- `server/middleware/admin-auth.ts` — защищает `/api/admin/**`: проверяет сессию и запись в `admins`, устанавливает `event.context.userId`.
- `middleware/admin.global.ts` — клиентская/SSR защита `/admin/**` (кроме `/admin/login`).
- `middleware/account.ts` — клиентская защита `/account`.
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
| `/account` | Личный кабинет (история заказов, профиль) |
| `/privacy` | Политика конфиденциальности |
| `/admin` | Дашборд |
| `/admin/login` | Вход в админку |
| `/admin/orders` | Обработка заказов |
| `/admin/products` | Товары магазина |
| `/admin/users` | Пользователи и права админа |
| `/admin/gallery`, `/admin/prices`, `/admin/workers`, `/admin/contacts` | Остальные разделы админки |

## Заказы

Таблицы:

- `orders` — заказ, клиентские данные на момент заказа, сумма, статус, комментарий клиента, комментарий продавца.
- `order_items` — снимок состава заказа: товар, название, фото, цена, количество, сумма строки, `stockDeducted` (1 если остаток списан), `services` (JSON строка — список услуг, привязанных к позиции).
- `order_history` — журнал событий по заказу (смена статуса, изменение суммы), с `adminId` автора.

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

Сумму заказа админ может менять только в статусах `created`, `accepted` и `in_progress`. Если сумма меняется, комментарий продавца обязателен. Правило должно сохраняться на сервере, не только в UI.

## Товары

Поля `photos`, `specs`, `services` в таблице `products` хранятся как `text` (JSON-строки) и парсятся на уровне API. Аналогично `services` в `order_items`. При работе с этими полями всегда использовать `JSON.parse`/`JSON.stringify`, не сохранять объекты напрямую.

## Загрузка файлов

`POST /api/admin/upload` — загружает изображение в `public/uploads/`. Разрешённые форматы: JPEG, PNG, WebP, GIF. Лимит: 8 МБ. Возвращает `{ url: "/uploads/<filename>" }`.

## Rate limiting

Утилиты в `server/utils/rate-limit.ts`: `assertRateLimit`, `recordRateLimitHit`, `clearRateLimit`. Используют Nitro storage (`rate-limit` namespace). Вызывать `assertRateLimit` перед обработкой и `recordRateLimitHit` после успешной проверки.

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
- Не откатывать чужие изменения в dirty worktree.
- После изменений в Nuxt/API запускать `npm run build`.
- Не хранить секреты в репозитории.
- При добавлении write endpoints под `/api/admin/**` полагаться на `admin-auth` middleware, но всё равно валидировать входные данные в endpoint.
- Публичные write endpoints должны проверять авторизацию и same-origin, если используют cookie session.
- Для валидации входных данных использовать хелперы из `server/utils/validators.ts` (`parseTrimmedString`, `parsePositiveInteger`, `parseRouteId` и т.д.).

## Важные env-переменные

- `DATABASE_URL` — PostgreSQL connection string.
- `SESSION_SECRET` — секрет подписи cookie, минимум 32 символа.
- `NODE_ENV` — `development` или `production`.
- `ADMIN_PHONE` — телефон первого администратора для seed.
- `ADMIN_PASSWORD` — пароль первого администратора для seed.
