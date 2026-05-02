# Острый край — сайт мастерской по заточке

Сайт мастерской по заточке инструментов «Острый край», г. Орёл.  
Стек: Nuxt 3, Vue 3, TypeScript, Drizzle ORM, Tailwind CSS, PostgreSQL.

---

## Развёртывание на чистой Debian-машине

### 1. Установка Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash -
sudo apt-get install -y nodejs
node --version   # >= 18
```

### 2. Установка PostgreSQL

```bash
sudo apt-get install -y postgresql postgresql-client
sudo service postgresql start
```

Создать пользователя и базу данных:

```bash
sudo -u postgres psql <<EOF
CREATE USER zatochka WITH PASSWORD 'ваш_пароль';
CREATE DATABASE zatochka OWNER zatochka;
EOF
```

### 3. Клонирование репозитория

```bash
git clone https://github.com/ElPresedente/zatochka-site.git
cd zatochka-site
```

### 4. Переменные окружения

```bash
cp .env.example .env
```

Открыть `.env` и задать строку подключения:

```
DATABASE_URL=postgresql://zatochka:ваш_пароль@localhost:5432/zatochka
```

### 5. Установка зависимостей

```bash
npm install
```

### 6. Инициализация базы данных

```bash
npm run db:push   # создать таблицы
npm run db:seed   # заполнить начальными данными
```

### 7. Запуск

**Режим разработки:**

```bash
npm run dev
# Сайт доступен на http://localhost:3000
```

**Продакшн-сборка:**

```bash
npm run build
npm run preview   # проверить сборку локально
node .output/server/index.mjs   # запустить production-сервер
```

---

## Обновление сайта

```bash
git pull
npm install          # если изменился package.json
npm run db:migrate   # если появились новые миграции
npm run build
# перезапустить процесс node .output/server/index.mjs
```

---

## Переменные окружения

| Переменная | Пример | Описание |
|---|---|---|
| `DATABASE_URL` | `postgresql://user:pass@localhost:5432/zatochka` | Строка подключения к PostgreSQL |
