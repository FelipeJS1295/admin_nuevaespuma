# ---------- Etapa 1: construir ----------
FROM node:24-slim AS build
WORKDIR /app

RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig*.json nest-cli.json ./
COPY src ./src
RUN npm run build && test -f dist/main.js

# ---------- Etapa 2: ejecutar ----------
FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package*.json ./
COPY tsconfig*.json ./
COPY prisma ./prisma
COPY scripts ./scripts

EXPOSE 3333
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]