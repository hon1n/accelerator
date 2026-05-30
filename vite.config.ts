import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";

/**
 * Список origin'ов, которым разрешено обращаться к Vite-серверу
 * (как dev, так и preview). Сюда внесены только origin'ы бекенда —
 * никакие сторонние сайты не смогут делать кросс-доменные запросы
 * к ресурсам фронта.
 *
 * Если бекенд деплоится на другой домен/порт — добавьте его сюда
 * (или вынесите в переменную окружения VITE_BACKEND_ORIGINS).
 */
const BACKEND_ORIGINS: (string | RegExp)[] = [
  "http://localhost:8000",
  "http://127.0.0.1:8000",
];

const corsOptions = {
  origin: BACKEND_ORIGINS,
  credentials: true,
  methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
};

/**
 * Заголовки безопасности, которые корректно работают только когда приходят
 * настоящим HTTP-ответом (через <meta> их игнорирует браузер).
 *
 * - Content-Security-Policy: frame-ancestors 'none' — запрещаем встраивать
 *   приложение в любой <iframe> (защита от clickjacking).
 * - X-Frame-Options: DENY — то же самое для старых браузеров.
 *
 * В проде эти же заголовки должен отдавать reverse proxy / backend,
 * который раздаёт собранный фронт.
 */
const securityHeaders: Record<string, string> = {
  "Content-Security-Policy": "frame-ancestors 'none'",
  "X-Frame-Options": "DENY",
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  server: {
    cors: corsOptions,
    headers: securityHeaders,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
  preview: {
    cors: corsOptions,
    headers: securityHeaders,
  },
});
