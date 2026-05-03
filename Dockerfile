# Build static frontend + run Express API (Cloud Run / GKE compatible)
FROM node:20-bookworm-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY frontend ./frontend
COPY backend ./backend

RUN npm run build

FROM node:20-bookworm-slim AS production
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
COPY backend ./backend

ENV PORT=8080
EXPOSE 8080

USER node
CMD ["node", "backend/index.mjs"]
