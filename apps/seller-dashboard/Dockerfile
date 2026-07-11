FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
COPY apps/seller-dashboard/package*.json ./apps/seller-dashboard/
COPY packages/ ./packages/
RUN npm ci
COPY apps/seller-dashboard/ ./apps/seller-dashboard/
WORKDIR /app/apps/seller-dashboard
RUN npx vite build

FROM nginx:alpine
COPY --from=builder /app/apps/seller-dashboard/dist /usr/share/nginx/html
EXPOSE 80
