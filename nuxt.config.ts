export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },

  modules: ['@nuxtjs/tailwindcss'],

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL,
    sessionSecret: process.env.SESSION_SECRET,
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
    telegramChatId: process.env.TELEGRAM_CHAT_ID,
    yookassaShopId: process.env.YOOKASSA_SHOP_ID || '',
    yookassaSecretKey: process.env.YOOKASSA_SECRET_KEY || '',
    siteUrl: process.env.SITE_URL || '',
    // Базовый URL для ссылок в письмах (verify/reset). Падает на siteUrl, если не задан.
    appUrl: process.env.APP_URL || '',
    // Транзакционная почта (см. server/utils/mailer.ts). Пусто на dev = письма логируются в консоль.
    mailFrom: process.env.MAIL_FROM || '',
    smtpHost: process.env.SMTP_HOST || '',
    smtpPort: process.env.SMTP_PORT || '587',
    smtpUser: process.env.SMTP_USER || '',
    smtpPass: process.env.SMTP_PASS || '',
    cdekAccount: process.env.CDEK_ACCOUNT || 'EMscd6r9JnFiQ3bLoyjJY6eM',
    cdekSecure: process.env.CDEK_SECURE || 'PjLZkKBHEiLK3YsjtNrt3TGNG0ahs3kG',
    cdekTestMode: process.env.CDEK_TEST_MODE !== 'false',
    // Геокодер используется только сервером (через /api/delivery/geocode), ключ не светится в браузере.
    yandexMapsGeocoderKey: process.env.YANDEX_MAPS_GEOCODER_KEY || '',
    public: {
      yandexMapsJsApiKey: process.env.YANDEX_MAPS_JS_API_KEY || '',
      // Ключ саджеста нужен клиенту для передачи в скрипт JS API.
      // Оставить пустым, если Геосаджест подключён на тот же ключ, что JS API.
      yandexMapsSuggestKey: process.env.YANDEX_MAPS_SUGGEST_KEY || '',
    },
  },

  nitro: {
    routeRules: {
      '/**': {
        headers: {
          'X-Frame-Options': 'DENY',
          'X-Content-Type-Options': 'nosniff',
          'Referrer-Policy': 'origin-when-cross-origin',
          'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
          'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
          // CSP: 'unsafe-inline' для style требуется Nuxt SSR (style hydration);
          // 'unsafe-inline' для script нужен из-за inline payload Nuxt.
          // При желании можно перевести на nonce через nuxt-security.
          'Content-Security-Policy': [
            "default-src 'self'",
            "base-uri 'self'",
            "frame-ancestors 'none'",
            "object-src 'none'",
            "form-action 'self'",
            "img-src 'self' data: blob: https://*.maps.yandex.net https://static-maps.yandex.ru https://yastatic.net https://yandex.ru https://*.yandex.ru https://api-maps.yandex.ru https://*.api-maps.yandex.ru",
            "font-src 'self' https://fonts.gstatic.com",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://api-maps.yandex.ru https://*.api-maps.yandex.ru https://yastatic.net",
            // 'unsafe-eval' требуется векторным движком Maps v3 для разбора тайлов.
            // suggest-maps.yandex.ru — ymaps3.suggest работает через JSONP (инжект <script>),
            // поэтому домен нужен именно в script-src, не только в connect-src.
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://api-maps.yandex.ru https://*.api-maps.yandex.ru https://suggest-maps.yandex.ru https://yastatic.net https://core-renderer-tiles.maps.yandex.net",
            // data: нужен для воркеров Maps v3 (создаются из data: URL с importScripts из yastatic.net).
            "worker-src blob: data: https://api-maps.yandex.ru https://*.api-maps.yandex.ru https://yastatic.net",
            // *.api-maps.yandex.ru покрывает log.api-maps.yandex.ru (телеметрия Maps v3).
            // К api.cdek.ru/geocode-maps браузер не ходит напрямую — всё через свои
            // same-origin эндпоинты (/api/delivery/*), серверный геокодер CSP не касается.
            "connect-src 'self' https://api.telegram.org https://api-maps.yandex.ru https://*.api-maps.yandex.ru https://suggest-maps.yandex.ru https://*.maps.yandex.net",
            "frame-src 'self' https://yandex.ru https://*.yandex.ru https://*.yandex.net",
          ].join('; '),
        },
      },
    },
  },

  app: {
    head: {
      htmlAttrs: { lang: 'ru' },
      meta: [
        // TODO: заменить на реальный URL сайта после деплоя
        // { property: 'og:url', content: 'https://example.ru' },

        // TODO: заменить на реальное название сайта
        // { property: 'og:site_name', content: 'Острый край' },

        { property: 'og:type', content: 'website' },
        { property: 'og:locale', content: 'ru_RU' },

        // TODO: заменить на реальный заголовок
        // { property: 'og:title', content: 'Острый край — Заточка инструмента' },

        // TODO: заменить на реальное описание
        // { property: 'og:description', content: 'Профессиональная заточка маникюрного, парикмахерского и домашнего инструмента в Брянске' },

        // TODO: загрузить OG-картинку 1200×630 px в public/images/og-cover.jpg и раскомментировать
        // { property: 'og:image', content: 'https://example.ru/images/og-cover.jpg' },
        // { property: 'og:image:width', content: '1200' },
        // { property: 'og:image:height', content: '630' },
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/icons/favicon.ico' },
        { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/icons/favicon-16x16.png' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/icons/favicon-32x32.png' },
        { rel: 'icon', type: 'image/png', sizes: '96x96', href: '/icons/favicon-96x96.png' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/icons/apple-touch-icon.png' },
        {
          rel: 'preconnect',
          href: 'https://fonts.googleapis.com',
        },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
        },
      ],
    },
  },
})
