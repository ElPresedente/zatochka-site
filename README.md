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

## Развёртывание на Windows (для разработки)

### 1. Установка Node.js

Скачать и установить Node.js 22 LTS с [nodejs.org](https://nodejs.org/) (установщик `.msi`).

Проверить после установки (в новом окне терминала):

```powershell
node --version   # >= 18
npm --version
```

### 2. PostgreSQL — два варианта

**Вариант А: Docker Desktop (рекомендуется)**

1. Установить [Docker Desktop для Windows](https://www.docker.com/products/docker-desktop/).
2. Запустить контейнер с PostgreSQL:

```powershell
docker run -d `
  --name zatochka-pg `
  -e POSTGRES_USER=zatochka `
  -e POSTGRES_PASSWORD=ваш_пароль `
  -e POSTGRES_DB=zatochka `
  -p 5432:5432 `
  postgres:16
```

Контейнер будет стартовать автоматически вместе с Docker Desktop.

**Вариант Б: Нативная установка PostgreSQL**

1. Скачать и установить PostgreSQL 16 с [postgresql.org](https://www.postgresql.org/download/windows/).
2. В ходе установки задать пароль для пользователя `postgres`.
3. После установки открыть **SQL Shell (psql)** из меню «Пуск» и создать базу:

```sql
CREATE USER zatochka WITH PASSWORD 'ваш_пароль';
CREATE DATABASE zatochka OWNER zatochka;
\q
```

### 3. Клонирование репозитория

```powershell
git clone https://github.com/ElPresedente/zatochka-site.git
cd zatochka-site
```

> Если Git не установлен — скачать с [git-scm.com](https://git-scm.com/download/win).

### 4. Переменные окружения

```powershell
copy .env.example .env
```

Открыть `.env` в любом редакторе и задать строку подключения:

```
DATABASE_URL=postgresql://zatochka:ваш_пароль@localhost:5432/zatochka
```

### 5. Установка зависимостей

```powershell
npm install
```

### 6. Инициализация базы данных

```powershell
npm run db:push   # создать таблицы
npm run db:seed   # заполнить начальными данными
```

### 7. Запуск dev-сервера

```powershell
npm run dev
# Сайт доступен на http://localhost:3000
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
