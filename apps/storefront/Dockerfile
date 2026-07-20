FROM node:20-slim AS builder
WORKDIR /app

COPY package*.json ./
COPY apps/storefront/package*.json ./apps/storefront/
COPY packages/ ./packages/
RUN npm ci

COPY apps/storefront/ ./apps/storefront/

ARG VITE_MEDUSA_BASE_URL=http://127.0.0.1:9000
ARG VITE_STORE_ID=default_store
ENV VITE_MEDUSA_BASE_URL=$VITE_MEDUSA_BASE_URL
ENV VITE_STORE_ID=$VITE_STORE_ID

WORKDIR /app/apps/storefront
RUN npx vite build

FROM nginx:alpine
COPY --from=builder /app/apps/storefront/dist /usr/share/nginx/html
EXPOSE 80
