-- Подтверждение смены email: новый адрес хранится в pending_email до перехода по ссылке
ALTER TABLE users ADD COLUMN IF NOT EXISTS pending_email text;
