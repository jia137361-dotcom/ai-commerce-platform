FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
COPY apps/storefront/package*.json ./apps/storefront/
COPY packages/ ./packages/
RUN npm ci
COPY apps/storefront/ ./apps/storefront/
WORKDIR /app/apps/storefront
RUN npx vite build

FROM nginx:alpine
COPY --from=builder /app/apps/storefront/dist /usr/share/nginx/html
EXPOSE 80
