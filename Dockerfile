# Этап сборки
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
# устанавливаем pnpm
RUN npm install -g pnpm
RUN pnpm install --no-frozen-lockfile
COPY . .
RUN pnpm run build

# Продакшен – просто отдаём статику через стандартный nginx
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
# Никакого своего nginx.conf не копируем!
# Порт 80 уже слушается автоматически.
COPY nginx.conf /etc/nginx/conf.d/default.conf