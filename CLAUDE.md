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

- Пользователи: `users` (телефон + хэш пароля + необязательный `email`).
- Вход: по номеру телефона **или** по email — `POST /api/auth/login` принимает поле `login`, определяет тип по наличию `@`.
- Регистрация: email обязателен для новых пользователей. Уникальный частичный индекс `users_email_unique` не затрагивает старые аккаунты без email.
- **Подтверждение email (см. раздел «Транзакционная почта»):** при регистрации аккаунт создаётся с `email_verified = false`, сессия НЕ создаётся (нет авто-логина). Вход заблокирован (403, `data.code = 'email_not_verified'`), пока email не подтверждён — для аккаунтов с привязанной почтой. Старые аккаунты на момент миграции `0018` помечены verified, чтобы не заблокировать их.
- Админы: отдельная таблица `admins`, связанная с `users` (userId PK, onDelete cascade).
- Сессия: `server/utils/session.ts`, cookie `sid`, 7 дней, httpOnly, sameSite: lax, secure по протоколу. Полезная нагрузка — `{ userId, sv }`, где `sv` = `users.session_version`.
- **Инвалидация сессий:** кука stateless-подписанная, серверной таблицы сессий нет. При сбросе пароля `users.session_version` инкрементируется. `server/middleware/0.session-version.ts` (запускается ПЕРВЫМ, до `admin-auth`) сверяет `sv` сессии с БД для `/api/**` при наличии `userId`; при расхождении гасит сессию.
- `SESSION_SECRET` должен быть не короче 32 символов; приложение падает на старте, если секрет дефолтный.
- Публичные auth endpoints: `server/api/auth/*`.
- `server/middleware/same-origin.ts` — same-origin guard для всех небезопасных методов (POST/PUT/PATCH/DELETE) на `/api/**`. **Исключение: `/api/yookassa/webhook`** — ЮKassa шлёт POST без Origin.
- `server/middleware/admin-auth.ts` — защищает `/api/admin/**`: проверяет сессию и запись в `admins`, устанавливает `event.context.userId`.
- `middleware/admin.global.ts` — клиентская/SSR защита `/admin/**` (кроме `/admin/login`).
- `middleware/account.ts` — клиентская защита `/account`.
- В SSR-запросах к `/api/auth/me` нужно использовать `useRequestFetch()`, иначе cookie пользователя может не попасть в server-side fetch.

## Личный кабинет

Все `/api/account/*` требуют авторизации (проверяют `session.data.userId`).

- `GET /api/account/profile` — имя, фамилия, телефон, email текущего пользователя.
- `PATCH /api/account/profile` — обновление имени, фамилии и email. **Смена email требует подтверждения:** новый адрес кладётся в `users.pending_email` (текущий email не меняется), на новый адрес уходит письмо со ссылкой; ответ содержит `emailChangePending: true`. Переход по ссылке (`verify-email`) применяет `pending_email` → `email` и помечает verified. Очистка email — без подтверждения.
- `GET /api/account/orders` — история заказов пользователя (с позициями и историей).
- `GET /api/account/orders/[id]` — один заказ пользователя по ID.
- `POST /api/account/orders/[id]/pay` — создать платёж ЮKassa для неоплаченного заказа. Работает для любого способа оплаты (в т.ч. `cash` — тогда `paymentMethod` автоматически меняется на `online_card`).
- `POST /api/account/orders/[id]/pay-extra` — создать платёж ЮKassa для pending-доплаты (при корректировке состава оплаченного заказа).
- `PATCH /api/account/password` — смена пароля; тело: `{ currentPassword, newPassword }`, минимум 6 символов.
- `POST /api/account/password-reset` — пользователь запрашивает сброс пароля администратором; отправляет уведомление в Telegram через `notifyPasswordResetRequest` (без публичного `forgot-password` — это отдельный эндпоинт).
- `POST /api/account/deletion-request` — запрос на удаление аккаунта; проставляет `deletionRequestedAt`, отправляет уведомление в Telegram через `notifyDeletionRequest`. Повторный запрос возвращает 409.

## Основные страницы

| Page | Назначение |
|---|---|
| `/` | Главная |
| `/services` | Прайс услуг |
| `/gallery` | Галерея |
| `/about` | О мастерской |
| `/shop` | Магазин, корзина, создание заказов |
| `/login` | Публичная авторизация |
| `/register` | Регистрация (после неё — экран «подтвердите email») |
| `/forgot-password` | Восстановление пароля по email |
| `/confirm` | Результат подтверждения email (`?status=ok\|invalid`) |
| `/reset` | Форма нового пароля по ссылке из письма (`?token=...`) |
| `/account` | Личный кабинет (история заказов, профиль) |
| `/payment/return` | Страница возврата после оплаты ЮKassa (`?order_id=X`) |
| `/offer` | Публичная оферта |
| `/terms` | Пользовательское соглашение |
| `/privacy` | Политика обработки персональных данных |
| `/consent` | Согласие на обработку персональных данных (152-ФЗ) |
| `/admin` | Дашборд |
| `/admin/login` | Вход в админку |
| `/admin/orders` | Обработка заказов |
| `/admin/products` | Товары магазина |
| `/admin/collections` | Подборки товаров |
| `/admin/users` | Пользователи и права админа |
| `/admin/gallery`, `/admin/prices`, `/admin/workers`, `/admin/contacts` | Остальные разделы админки |

## Схема БД

Таблицы в `server/db/schema/`:

| Таблица | Назначение |
|---|---|
| `users` | Пользователи: телефон, имя, фамилия, хэш пароля, `email` (nullable), `emailVerified`, `pendingEmail` (новый email до подтверждения), `sessionVersion`, `consentGivenAt`, `consentVersion`, `deletionRequestedAt` |
| `email_tokens` | Одноразовые токены подтверждения email/сброса пароля: `userId`, `purpose` (`verify\|reset`), `tokenHash` (SHA-256), `expiresAt`, `consumedAt` |
| `admins` | Привязка userId → роль администратора (userId PK, onDelete cascade) |
| `orders` | Заказы: клиентские данные, сумма, статус, `userComment`, `sellerComment`, поля оплаты (см. ниже) |
| `order_items` | Снимок состава заказа: название, фото, цена, `stockDeducted`, `services` (JSON) |
| `order_history` | Журнал событий заказа (смена статуса, суммы) с `adminId` автора |
| `products` | Товары: `photos`, `specs`, `services` — JSON-строки; `coverPosition` — CSS `object-position` обложки; `active`, `sortOrder` |
| `product_categories` | Категории товаров: `name`, `sortOrder`, `hidden` (скрыть на сайте, не удалять) |
| `product_collections` | Подборки товаров: `name`, `sortOrder`, `active` |
| `product_collection_items` | Состав подборки: составной PK `(collectionId, productId)`, `sortOrder`; onDelete cascade |
| `service_categories` | Категории прайса с `sortOrder` |
| `service_items` | Позиции прайса: `categoryId`, `name`, `price`, `sortOrder` |
| `service_notes` | Сноски к прайсу с `sortOrder` |
| `gallery_sections` | Разделы галереи с `sortOrder` |
| `gallery_images` | Изображения галереи: `sectionId`, `src`, `label`, `sortOrder` |
| `workers` | Мастера: `name`, `role`, `photo`, `sortOrder` |
| `site_settings` | Key-value хранилище настроек сайта (контакты, часы и т.д.) |

## Настройки сайта

`site_settings` — key-value таблица для контактов, часов работы и других параметров.

- `GET /api/settings` — публичный, возвращает все настройки как плоский объект `{ [key]: value }`.
- `PUT /api/admin/settings` — обновляет набор ключей, защищён `admin-auth`.

## Заказы

Таблицы:

- `orders` — заказ, клиентские данные на момент заказа, сумма, статус, комментарий клиента, комментарий продавца, поля оплаты.
- `order_items` — снимок состава заказа: товар, название, фото, цена, количество, сумма строки, `stockDeducted` (1 если остаток списан), `services` (JSON строка — список услуг, привязанных к позиции).
- `order_history` — журнал событий по заказу (смена статуса, изменение суммы), с `adminId` автора.

Поля оплаты в таблице `orders`:

| Поле | Тип | Назначение |
|---|---|---|
| `paymentMethod` | `cash` \| `online_card` | Способ оплаты (по умолчанию `cash`) |
| `paymentStatus` | `unpaid` \| `paid` \| `failed` \| `refunded` \| `waiting_for_capture` | Статус основного платежа |
| `yookassaPaymentId` | text nullable | ID платежа в ЮKassa |
| `paidAt` | timestamp nullable | Время оплаты |
| `customerEmail` | text | Email для чека (снимок на момент заказа) |
| `extraPaymentId` | text nullable | ID платежа ЮKassa для доплаты |
| `extraPaymentAmount` | integer nullable | Сумма доплаты в рублях |
| `extraPaymentStatus` | `none` \| `pending` \| `paid` \| `failed` | Статус доплаты |

Создание заказа:

- Endpoint: `POST /api/orders`.
- Требует авторизованного пользователя.
- Сохраняет текущую корзину, комментарий пользователя и сумму на момент заказа.
- При `paymentMethod = 'online_card'` создаёт платёж ЮKassa и возвращает `{ confirmationUrl }` для редиректа.
- Уведомление о новом заказе отправляется в Telegram через `notifyOrderCreated` в `server/utils/order-notifications.ts`. Требует `TELEGRAM_BOT_TOKEN` и `TELEGRAM_CHAT_ID` в env.

Статусы:

```text
created -> accepted -> in_progress -> ready -> completed
created -> cancelled
accepted/in_progress/ready -> cancelled
```

При переходе `created -> accepted` остатки товаров списываются в транзакции. При отмене после `accepted`, `in_progress` или `ready` остатки возвращаются. `cancelled` и `completed` финальные.

**Отмена оплаченного заказа** (`paymentStatus = 'paid'`): перед сменой статуса на `cancelled` автоматически вызывается полный возврат через ЮKassa API. Если ЮKassa недоступна — отмена блокируется (502). После успешного возврата `paymentStatus` меняется на `refunded`.

**Редактирование состава заказа** (`PUT /api/admin/orders/[id]`):
- Сумма заказа **не вводится вручную** — она всегда равна сумме позиций и пересчитывается автоматически.
- Состав редактируется только в статусах `created`, `accepted`, `in_progress`.
- Если заказ **оплачен** и состав изменён:
  - Сумма уменьшилась → автоматический частичный возврат через ЮKassa с чеком-корректировкой.
  - Сумма увеличилась → создаётся extra-платёж ЮKassa на разницу; клиент видит кнопку «Доплатить» в ЛК.
  - При ошибке ЮKassa пишется запись в историю заказа с пометкой ВНИМАНИЕ.

**Отображение оплаты и доставки в админке** (`/admin/orders`):
- Карточка заказа: блок `components/admin/OrderPaymentDelivery.vue` (между `OrderHeader` и формой) — способ/статус оплаты, дата оплаты, ссылка на платёж в ЮKassa, доплата; способ/направление доставки, стоимость, адрес (Орёл), ПВЗ/срок/номер заказа СДЭК (Россия). Блок read-only.
- Список заказов: `components/admin/OrdersTable.vue` — колонка «Оплата / Доставка» (десктоп) и строка бейджей (мобильный): статус оплаты + короткий ярлык доставки.
- Ярлыки: `DELIVERY_METHOD_LABELS`, `DELIVERY_SCOPE_LABELS`, `EXTRA_PAYMENT_STATUS_LABELS`, `PAYMENT_*_LABELS/CLASSES` — все в `types/api.ts`.
- **Важно:** `GET /api/admin/orders` (список) селектит НЕ все поля заказа, а явный набор колонок. Карточка (`GET /api/admin/orders/[id]`) возвращает строку целиком (`...order`). Если в список нужен новый бейдж по полю заказа — добавь это поле в `select` в `server/api/admin/orders/index.get.ts` (иначе оно придёт `undefined`, хотя в `OrderRowDto` объявлено).
- Номер заказа СДЭК в карточке — это `cdekOrderUuid` (внутренний UUID из ответа `POST /v2/orders`), а НЕ публичный трек-номер `cdek_number`. Для трек-номера/статуса посылки нужен отдельный запрос `GET /v2/orders/<uuid>` к СДЭК (пока не реализован).

## Товары

Поля `photos`, `specs`, `services` в таблице `products` хранятся как `text` (JSON-строки). Аналогично `services` в `order_items`. Для их парсинга использовать типизированные хелперы из `server/utils/json-shapes.ts` — они никогда не бросают и возвращают безопасный fallback при битых данных:

- `parseProductPhotos(value)` → `string[]`
- `parseProductSpecs(value)` → `{ key, value }[]`
- `parseProductServices(value)` → `{ id, name, price }[]`
- `parseOrderItemServices(value)` → `{ name, price }[]`

Не использовать сырой `JSON.parse` для этих полей — используй хелперы.

## Подборки товаров

Подборки — именованные списки товаров для отображения на страницах (напр., «Рекомендуем»). Управляются через `/admin/collections`.

- `GET /api/collections` — публичный список активных подборок с товарами.
- `GET /api/admin/collections` — список всех подборок (включая неактивные).
- `POST /api/admin/collections` — создать подборку.
- `PUT /api/admin/collections/[id]` — обновить подборку (название, состав, порядок, active).
- `DELETE /api/admin/collections/[id]` — удалить подборку.

## Загрузка и удаление файлов

`POST /api/admin/upload` — загружает изображение в `public/uploads/`. Разрешённые форматы: JPEG, PNG, WebP, GIF. Лимит: 8 МБ. Возвращает `{ url: "/uploads/<filename>" }`.

При удалении продукта или изображения галереи нужно также удалять файлы с диска. Для этого использовать хелперы из `server/utils/uploads.ts`:
- `deleteUploadFile(url)` — удаляет один файл, если url начинается с `/uploads/`. Защита от path traversal встроена. Не бросает при отсутствии файла.
- `deleteUploadFiles(urls[])` — удаляет несколько файлов параллельно.

`public/` целиком в `.gitignore`. Исключения, добавленные форсом (`git add -f`):
- `public/icons/` — favicon и иконки для iOS/Android, сгенерированы скриптом `scripts/generate-icons.mjs` из `public/images/logo.png`.
- `public/robots.txt` — запрещает индексацию `/admin/`, `/api/`, `/account`, `/login`, `/register`.

## ЮKassa

Утилиты в `server/utils/yookassa.ts`:

- `createYookassaPayment(orderId, amountRubles, returnUrl, receipt?, paymentType?)` — создать платёж. `paymentType: 'extra'` используется для доплат при корректировке состава.
- `createYookassaRefund(paymentId, amountRubles, receipt?)` — полный или частичный возврат.
- `fetchYookassaPayment(paymentId)` — получить статус платежа.
- `buildReceiptItems(items)` — построить позиции чека из состава заказа (54-ФЗ): каждая позиция разбивается на товарную строку + строки услуг.
- `buildAdjustmentReceiptItem(description, amountRubles)` — одна строка чека для корректировок и доплат.

**Цены в БД хранятся в рублях (целые числа).** Передавать в ЮKassa как `amountRubles.toFixed(2)` — **без деления на 100**.

Webhook `POST /api/yookassa/webhook`:
- Исключён из same-origin middleware.
- Обрабатывает `payment.succeeded` и `payment.canceled`.
- Для extra-платежей: metadata содержит `payment_type: 'extra'` — обновляет `extraPaymentStatus`, не трогает `paymentStatus`.
- Идемпотентен: обновление происходит только если `yookassaPaymentId` совпадает и статус ещё не `paid`.

В ЛК ЮKassa настроить вебхук: `POST https://your-site.ru/api/yookassa/webhook` (события: `payment.succeeded`, `payment.canceled`).

## Доставка

Три способа доставки, вся клиентская логика — в `components/shop/CartDrawer.vue` (монтируется в корзине на `/shop`):

1. **Самовывоз** — адрес мастерской, ссылка на карты. Адрес клиента не запрашивается.
2. **По Орлу** — Яндекс.Карты v3 с полигоном зоны доставки + адресный саджест. Стоимость считается на сервере (`server/utils/delivery.ts`): фикс. тариф `delivery_orel_fee`, бесплатно от `delivery_orel_free_threshold`.
3. **По России** — свой пикер ПВЗ СДЭК: поле города с автодополнением → ПВЗ выбранного города (список + карта Яндекса) → выбор точки → расчёт тарифа.

   **Почему НЕ виджет `@cdek-it/widget@3`:** виджет грузит ВСЕ ~10 500 ПВЗ России разом (нет опции загрузки по городу/региону — проверено по вики и бандлу). На боевых кредах это давало ~18 МБ и **~40 с фриза главного потока браузера на рендере/кластеризации 10 тыс. маркеров** (доказано HAR: 39-секундный простой без сетевой активности сразу после прихода данных). Виджет, его прокси (`cdek-proxy.*`), `cdekWidgetRequest`/`cdekOfficesRaw`/прогрев — удалены.

   **Новый поток грузит ПВЗ только выбранного города** (даже Москва ≈ 486 точек, не тысячи) → мгновенно. Вся клиентская логика в `components/shop/CartDrawer.vue` (`onCityInput`/`selectCity`/`initCdekMap`/`selectOffice`), карта — на общем `ensureYmaps3()` (тот же `ymaps3`, что и карта Орла).

Серверная часть:

- `server/utils/cdek.ts` — CDEK API client (OAuth, кэш токена; роутинг `api.edu.cdek.ru`/`api.cdek.ru` по `CDEK_TEST_MODE`). Хелперы пикера: `cdekCities(q)` (поиск города, `/v2/location/cities`), `cdekCityOffices(cityCode)` (ПВЗ города, `/v2/deliverypoints?city_code=`), `cdekOfficeTariff(cityCode, packages)` (тариф до ПВЗ: от `CDEK_SENDER_CITY_CODE=149` Орёл, самый дешёвый `delivery_mode===4` склад-склад). Все с кэшем в памяти процесса. `CDEK_SENDER_CITY_CODE` — единый код отправителя для тарифа и автосоздания заказа.
- `server/api/delivery/cdek-cities.get.ts` (`?q=`), `cdek-city-offices.get.ts` (`?cityCode=`), `cdek-tariff.post.ts` (`{cityCode, goods}`) — эндпоинты пикера.
- `server/api/delivery/geocode.get.ts` — серверный геокодер Орла. Вызывает `geocode-maps.yandex.ru` приватным ключом `YANDEX_MAPS_GEOCODER_KEY`, проверяет попадание в полигон через `pointInPolygon()`. **Ключ геокодера приватный — не в `runtimeConfig.public`.**
- `server/api/delivery/orel-polygon.get.ts` — полигон Орла. Кэш в `site_settings.delivery_orel_polygon` (JSON `[lat, lon][]`), фетч из Nominatim при первом обращении, hardcode-fallback.
- `server/api/orders/index.post.ts` — принимает delivery-поля, повторно валидирует полигон и пересчитывает стоимость/тариф на сервере (нельзя доверять клиенту).
- `server/api/yookassa/webhook.post.ts` — после `payment.succeeded` для СДЭК автосоздаёт заказ в СДЭК.

**Яндекс.Карты v3 (`ymaps3`) — критичные нюансы:**

- Координаты в v3 — `[lon, lat]` (GeoJSON-порядок). Полигон в БД хранится как `[lat, lon][]` и конвертируется при отрисовке.
- Загрузчик `https://api-maps.yandex.ru/v3/?apikey=...&lang=ru_RU` **НЕ принимает отдельный ключ саджеста** — любой параметр вида `suggest_apikey`/`suggestApikey` даёт HTTP 400 и роняет загрузку скрипта (`script.onerror` → `[ymaps3] init failed`). `ymaps3.suggest` авторизуется ОСНОВНЫМ JS-API-ключом: продукт «Геосаджест» включается на тот же ключ `YANDEX_MAPS_JS_API_KEY` в кабинете. `ymaps3.suggest` ходит на `suggest-maps.yandex.ru` через **JSONP** (инжект `<script>`), поэтому этот домен обязан быть в `script-src` CSP, а не только в `connect-src`.
- **Геокодер — только server-side.** Клиентский `ymaps.geocode`/HTTP-геокодер с JS-API-ключом даёт 403. Геокодирование адреса Орла идёт через `/api/delivery/geocode` приватным `YANDEX_MAPS_GEOCODER_KEY` (формат ответа `pos` = «lon lat»). CSP для него не нужен.
- Поле **HTTP Referer** ключа в кабинете Яндекса — переключатель версии API: пустое = v2.1, заполненное (формат `localhost` без протокола/порта) = v3.
- Контролы (`YMapZoomControl`, `YMapGeolocationControl` и пр.) **не входят в ядро `ymaps3`** — они в отдельном пакете `@yandex/ymaps3-controls`, грузятся через `ymaps3.import()`. В ядре есть только контейнер `YMapControls`. Сейчас карта Орла кнопок зума не имеет (зум скроллом/перетаскивание работают по умолчанию) — чтобы их добавить, нужен `ymaps3.import('@yandex/ymaps3-controls')`.
- ПВЗ СДЭК на карте — обычные `YMapMarker` с DOM-элементом (клик по маркеру = выбор ПВЗ, выбранный красится зелёным). Город ≤ ~500 точек, кластеризация не нужна. `ensureYmaps3()` проверяет `window.ymaps3` и берёт актуальный `.ready`, иначе инжектит скрипт сам.
- CSP под Maps v3 настроен в `nuxt.config.ts` (`script-src` с `unsafe-eval`, `worker-src data:`, `*.api-maps.yandex.ru` и др.). При изменениях карты сверяться с `yandex.ru/maps-api/docs/js-api/common/connection/csp.html`.

## Rate limiting

Утилиты в `server/utils/rate-limit.ts`: `assertRateLimit`, `recordRateLimitHit`, `clearRateLimit`. Используют Nitro storage (`rate-limit` namespace). Вызывать `assertRateLimit` перед обработкой и `recordRateLimitHit` после успешной проверки.

`assertRateLimit` — no-op при `NODE_ENV=development`, работает только в production.

Эндпоинты с rate limiting:
- `POST /api/auth/login` — 10 попыток / 15 мин (ключ: IP + raw login input)
- `POST /api/auth/register` — 5 попыток / 1 час (ключ: IP)
- `POST /api/auth/forgot-password` — 5 / 1 час по IP и 5 / 1 час по email (без энумерации)
- `POST /api/auth/resend-verification` — 5 / 1 час по IP и 5 / 1 час по email (без энумерации)
- `POST /api/orders` — 10 заказов / 1 час (ключ: IP + userId)

## Транзакционная почта (email)

Провайдеро-независимый слой отправки поверх `nodemailer` (SMTP → наш MTA). На dev без SMTP письма пишутся в консоль вместо доставки. Инфраструктура MTA (Postfix/OpenDKIM, DNS, PTR, порт 25) — вне репозитория приложения.

Утилиты:
- `server/utils/mailer.ts` — `sendMail({ to, subject, html, text })`. Транспорт из env `SMTP_*`; если `SMTP_HOST` пуст — лог в консоль.
- `server/utils/email-templates.ts` — шаблоны `verify / reset / orderCreated / orderReady`, каждый отдаёт `{ subject, html, text }` (multipart обязателен).
- `server/utils/email-tokens.ts` — `issueToken(userId, purpose)` / `consumeToken(rawToken, purpose)`. Токен — 32 случайных байта (base64url), в БД хранится только SHA-256-хеш. Гашение атомарно (`WHERE consumed_at IS NULL`). TTL: `verify` 24 ч, `reset` 1 ч.
- `server/utils/auth-emails.ts` — `sendVerificationEmail`, `sendPasswordResetEmail`, `sendOrderCreatedEmail`, `sendOrderReadyEmail`. Ссылки строятся из `APP_URL` (fallback `SITE_URL`).

Таблица `email_tokens` (`server/db/schema/email-tokens.ts`): `userId` (FK cascade), `purpose` (`verify|reset`), `tokenHash`, `expiresAt`, `consumedAt`, `createdAt`; индексы по `token_hash` и `(user_id, purpose)`.

Флоу:
- **Подтверждение email:** `register` шлёт письмо со ссылкой на `GET /api/auth/verify-email?token=` → помечает `email_verified`, redirect на `/confirm?status=ok|invalid`. Повторная отправка — `POST /api/auth/resend-verification { email }`. Тот же хендлер применяет `pending_email` при смене email (см. «Личный кабинет»).
- **Смена email:** один токен `purpose='verify'` обслуживает и регистрацию, и смену адреса. Различие — наличие `users.pending_email`: если он есть, `verify-email` переносит его в `email`; иначе просто verified.
- **Сброс пароля:** `POST /api/auth/forgot-password { email }` (одинаковый ответ всегда) → письмо со ссылкой на страницу `/reset?token=`. `POST /api/auth/reset-password { token, password }` (пароль ≥ 8) ставит новый bcrypt-хеш, помечает `email_verified`, инкрементирует `session_version` (инвалидирует сессии).
- **Уведомления о заказе:** письмо клиенту при создании заказа (`POST /api/orders`) и при переходе в `ready` (`status.put.ts`). Получатель — `customerEmail` заказа либо email аккаунта. Ошибки отправки не ломают основной поток.

Страницы: `/confirm` (результат подтверждения), `/reset` (форма нового пароля).

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
- Для валидации входных данных использовать хелперы из `server/utils/validators.ts`:
  - `parseTrimmedString(value, fieldName, opts?)` — строка с проверкой длины и required.
  - `parseOptionalString(value, fieldName, opts?)` — `undefined` → не трогать, `null` → `''`, строка → trimmed.
  - `parsePositiveInteger(value, fieldName)` — целое > 0.
  - `parseNonNegativeInteger(value, fieldName, max?)` — целое ≥ 0.
  - `parseRouteId(value, entity?)` — принимает `string | undefined` (результат `getRouterParam`), бросает 400 если не валидный id. Второй аргумент — название сущности для сообщения об ошибке.
  - `safeJsonParse(value, fallback)` — тихий JSON.parse с fallback.
  - `normalizePhone(raw)` — нормализует российский номер до 10 цифр, возвращает `null` если невалидный.
  - `parseEmail(value, fieldName, opts?)` — валидирует email, приводит к нижнему регистру, max 255 символов.

## Важные env-переменные

- `DATABASE_URL` — PostgreSQL connection string.
- `SESSION_SECRET` — секрет подписи cookie, минимум 32 символа.
- `NODE_ENV` — `development` или `production`.
- `ADMIN_PHONE` — телефон первого администратора для seed.
- `ADMIN_PASSWORD` — пароль первого администратора для seed.
- `TELEGRAM_BOT_TOKEN` — токен Telegram-бота для уведомлений о заказах и заявках на сброс пароля.
- `TELEGRAM_CHAT_ID` — ID чата/канала, куда отправляются уведомления.
- `YOOKASSA_SHOP_ID` — shopId из личного кабинета ЮKassa.
- `YOOKASSA_SECRET_KEY` — секретный ключ API ЮKassa.
- `SITE_URL` — базовый URL сайта (например `https://example.ru`), используется для формирования `return_url` платежей.
- `APP_URL` — базовый URL для ссылок в письмах (verify/reset). Если пусто — fallback на `SITE_URL`.
- `MAIL_FROM` — отправитель писем (на проде — адрес отправляющего поддомена, напр. `Острый край <noreply@mail.example.ru>`).
- `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` — submission нашего MTA. Если `SMTP_HOST` пуст — на dev письма пишутся в консоль, доставка не выполняется.
- `YANDEX_MAPS_JS_API_KEY` — ключ JS API v3 (public). На ключе в кабинете должны быть включены продукты «JavaScript API» и «Геосаджест»; в поле HTTP Referer — `localhost` для dev, прод-домен для прода.
- `YANDEX_MAPS_GEOCODER_KEY` — ключ Geocoder HTTP API (приватный, **не** public). Отдельный продукт/ключ для серверного геокодера Орла.
- `YANDEX_MAPS_SUGGEST_KEY` — устаревшая переменная: в v3 отдельный ключ саджеста загрузчику не передаётся (см. раздел «Доставка»). Не используется в загрузчике карты.
- `CDEK_ACCOUNT` / `CDEK_SECURE` — логин/пароль CDEK API (по умолчанию — тестовые credentials).
- `CDEK_TEST_MODE` — `false` = боевой СДЭК (`api.cdek.ru`); `true`/пусто = тест (`api.edu.cdek.ru`).

## Юридические документы

Оферта/ПДН/соглашение — статические Vue-шаблоны, реквизиты тянут из `site_settings` через `/api/settings`. Текущие редакции (синхронно обновлены 16 июня 2026 — онлайн-оплата, доставка, email-уведомления):

| Страница | Документ | Редакция |
|---|---|---|
| `/offer` | Публичная оферта | 1.1 |
| `/terms` | Пользовательское соглашение | 1.1 |
| `/privacy` | Политика обработки ПД | 1.2 |
| `/consent` | Согласие на обработку ПД | 1.1 |

- **Версия согласия фиксируется при регистрации** через `CONSENT_VERSION` в `server/api/auth/register.post.ts` (сейчас `'1.1'`) — должна совпадать с редакцией `/consent`.
- **Операторы онлайн-оплаты (ЮKassa)** — в оферте (п. 4.3), `/privacy` (п. 5), `/consent` (п. 5): оператор по переводу средств ООО НКО «ЮМани» (ИНН 7750005725, лицензия ЦБ РФ № 3510-К); платёжный агрегатор / отправитель кассового чека ООО «АЙТИГРУПП» (ИНН 4004020301).
- **Доставка:** по Орлу — собственный курьер; по России — «служба доставки СДЭК» **без указания юрлица/ИНН** (намеренно: контрагент по договору не подтверждён; в ЛК СДЭК значится ООО «СДЭК И ТОЧКА» ИНН 5027330380, но с договором не сверено). При подтверждении юрлица — проставить в `/privacy` и `/consent`.
- Коммерческие условия (оплата, доставка) живут в оферте; `/terms` лишь ссылается на неё — не дублировать.

## Запланированные изменения

### При выпуске новой редакции согласия на ПД

- Обновить `CONSENT_VERSION` в `server/api/auth/register.post.ts` — единственная точка изменения версии.
- Синхронно обновить редакцию и дату вступления в силу на `/consent`; сверить `/privacy`, `/terms`, `/offer`.
