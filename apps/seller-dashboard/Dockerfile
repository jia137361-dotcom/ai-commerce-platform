FROM node:20-slim AS builder
WORKDIR /app

COPY package*.json ./
COPY apps/seller-dashboard/package*.json ./apps/seller-dashboard/
COPY packages/ ./packages/
RUN npm ci

COPY apps/seller-dashboard/ ./apps/seller-dashboard/

ARG VITE_MEDUSA_URL=http://127.0.0.1:9000
ARG VITE_STOREFRONT_URL=http://127.0.0.1:3000
ARG VITE_STORE_ID=default_store
ENV VITE_MEDUSA_URL=$VITE_MEDUSA_URL
ENV VITE_STOREFRONT_URL=$VITE_STOREFRONT_URL
ENV VITE_STORE_ID=$VITE_STORE_ID

WORKDIR /app/apps/seller-dashboard
RUN npx vite build

FROM nginx:alpine
COPY --from=builder /app/apps/seller-dashboard/dist /usr/share/nginx/html
EXPOSE 80
