# Острый край

Сайт мастерской по заточке инструментов «Острый край» с магазином, авторизацией, корзиной, заказами и админ-панелью.

Стек: Nuxt 3, Vue 3, TypeScript, Tailwind CSS, Drizzle ORM, PostgreSQL.

## Возможности

- Публичные страницы: главная, услуги, галерея, о мастерской, магазин.
- Регистрация и вход пользователей.
- Корзина и оформление заказа только для авторизованных пользователей.
- Заказы с комментариями клиента и продавца.
- Админка: товары, категории, заказы, пользователи, галерея, прайс, работники, контакты.
- Обработка заказов по статусам: `Создан`, `Принят`, `В работе`, `Готов к выдаче`, `Завершен`, `Отменен`.

## Требования

- Node.js 20+ или 22 LTS.
- PostgreSQL 16+.
- Git.

## Быстрый запуск локально

```bash
git clone https://github.com/ElPresedente/zatochka-site.git
cd zatochka-site
npm install
cp .env.example .env
```

Заполнить `.env`, затем:

```bash
npm run db:migrate
npm run db:seed
npm run dev
```

Сайт будет доступен на `http://localhost:3000`.

Для доступа с других устройств в той же локальной сети:

```bash
npm run dev:lan
```

После запуска откройте на другом устройстве `http://<IP-адрес-компьютера>:3000`.
IP-адрес на Windows можно посмотреть командой `ipconfig`.

## Переменные окружения

Пример находится в `.env.example`.

| Переменная | Обязательна | Описание |
|---|---:|---|
| `DATABASE_URL` | да | Строка подключения к PostgreSQL |
| `NODE_ENV` | нет | `development` или `production` |
| `SESSION_SECRET` | да | Секрет подписи cookie, минимум 32 символа |
| `ADMIN_PHONE` | да для seed | Телефон первого администратора |
| `ADMIN_PASSWORD` | да для seed | Пароль первого администратора |

Пример:

```env
DATABASE_URL=postgresql://zatochka:strong_password@localhost:5432/zatochka
NODE_ENV=development
SESSION_SECRET=replace-with-a-random-string-at-least-32-chars
ADMIN_PHONE=+79000000000
ADMIN_PASSWORD=replace-with-admin-password
```

`SESSION_SECRET` нельзя оставлять дефолтным. Приложение намеренно падает, если секрет не задан безопасно.

## Развёртывание на Debian/Ubuntu

### 1. Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash -
sudo apt-get install -y nodejs
node --version
npm --version
```

### 2. PostgreSQL

```bash
sudo apt-get update
sudo apt-get install -y postgresql postgresql-client
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

Создать пользователя и базу:

```bash
sudo -u postgres psql
```

```sql
CREATE USER zatochka WITH PASSWORD 'strong_password';
CREATE DATABASE zatochka OWNER zatochka;
\q
```

### 3. Код и зависимости

```bash
git clone https://github.com/ElPresedente/zatochka-site.git
cd zatochka-site
npm ci
cp .env.example .env
nano .env
```

Минимально заполнить:

```env
DATABASE_URL=postgresql://zatochka:strong_password@localhost:5432/zatochka
NODE_ENV=production
SESSION_SECRET=replace-with-a-random-string-at-least-32-chars
ADMIN_PHONE=+79000000000
ADMIN_PASSWORD=replace-with-admin-password
```

### 4. База данных

```bash
npm run db:migrate
npm run db:seed
```

Если базовые данные уже есть, а нужно только создать/обновить администратора:

```bash
npm run db:seed-admin
```

### 5. Сборка и запуск

```bash
npm run build
node .output/server/index.mjs
```

По умолчанию Nuxt слушает порт `3000`. Для другого порта:

```bash
PORT=3001 node .output/server/index.mjs
```

### 6. systemd service

Пример `/etc/systemd/system/zatochka-site.service`:

```ini
[Unit]
Description=Zatochka Site
After=network.target postgresql.service

[Service]
Type=simple
WorkingDirectory=/var/www/zatochka-site
EnvironmentFile=/var/www/zatochka-site/.env
Environment=PORT=3000
ExecStart=/usr/bin/node .output/server/index.mjs
Restart=always
RestartSec=5
User=www-data
Group=www-data

[Install]
WantedBy=multi-user.target
```

Затем:

```bash
sudo systemctl daemon-reload
sudo systemctl enable zatochka-site
sudo systemctl start zatochka-site
sudo systemctl status zatochka-site
```

### 7. Nginx reverse proxy

Пример server block:

```nginx
server {
    listen 80;
    server_name example.com www.example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

После настройки HTTPS важно сохранять `X-Forwarded-Proto`, потому что cookie session выставляет `secure` по фактическому протоколу запроса.

## Развёртывание на Windows для разработки

### 1. Node.js

Установить Node.js 22 LTS с `https://nodejs.org/`.

Проверить:

```powershell
node --version
npm --version
```

### 2. PostgreSQL через Docker

```powershell
docker run -d `
  --name zatochka-pg `
  -e POSTGRES_USER=zatochka `
  -e POSTGRES_PASSWORD=strong_password `
  -e POSTGRES_DB=zatochka `
  -p 5432:5432 `
  postgres:16
```

### 3. Проект

```powershell
git clone https://github.com/ElPresedente/zatochka-site.git
cd zatochka-site
npm install
copy .env.example .env
notepad .env
npm run db:migrate
npm run db:seed
npm run dev
```

## Обновление уже развернутого сайта

```bash
cd /var/www/zatochka-site
git pull
npm ci
npm run db:migrate
npm run build
sudo systemctl restart zatochka-site
```

Если менялись только тексты/стили без зависимостей, `npm ci` можно пропустить, но `npm run build` и restart всё равно нужны.

## Работа с базой

```bash
npm run db:generate  # создать SQL-миграцию после изменения schema
npm run db:migrate   # применить миграции
npm run db:push      # только локально, без migration files
npm run db:studio    # UI Drizzle Studio
```

Для production использовать `db:migrate`, не `db:push`.

## Админка

Админка находится по адресу `/admin`. Кнопка админки в шапке видна только пользователям с записью в таблице `admins`.

Первый админ создается через:

```bash
npm run db:seed
```

или отдельно:

```bash
npm run db:seed-admin
```

Команды берут `ADMIN_PHONE` и `ADMIN_PASSWORD` из `.env`.

## Заказы

Покупатель набирает корзину, пишет необязательный комментарий и оформляет заказ. Заказ сохраняется в `orders` и `order_items`; уведомление пока реализовано заглушкой в логах, позднее сюда подключается Telegram.

Админ в `/admin/orders` видит таблицу заказов, открывает модалку состава, может менять комментарий продавца и сумму заказа в статусах `Создан` или `В работе`. При изменении суммы комментарий продавца обязателен.

При принятии заказа остатки товаров списываются. При отмене после принятия остатки возвращаются.

## Проверка перед релизом

```bash
npm run build
```

Сборка должна завершиться без ошибок. Warning из зависимостей Node/Nuxt не блокирует запуск, если build успешен.
