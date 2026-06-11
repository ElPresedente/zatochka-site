-- Подтверждение email и инвалидация сессий при сбросе пароля
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS session_version integer NOT NULL DEFAULT 0;

-- Бэкфилл: все существующие аккаунты на момент миграции считаем подтверждёнными,
-- чтобы блокировка входа по неподтверждённому email не заперла старых пользователей.
-- Новые регистрации создаются с email_verified = false (default).
UPDATE users SET email_verified = true WHERE email_verified = false;

-- Одноразовые токены подтверждения email и сброса пароля.
-- Хранится только hex SHA-256 от токена; «сырой» токен — лишь в ссылке письма.
CREATE TABLE IF NOT EXISTS email_tokens (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose text NOT NULL,
  token_hash text NOT NULL,
  expires_at timestamp NOT NULL,
  consumed_at timestamp,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_tokens_token_hash_idx ON email_tokens (token_hash);
CREATE INDEX IF NOT EXISTS email_tokens_user_purpose_idx ON email_tokens (user_id, purpose);
