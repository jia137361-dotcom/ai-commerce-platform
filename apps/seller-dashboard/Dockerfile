FROM node:20-slim AS builder
WORKDIR /app

COPY package*.json ./
COPY apps/seller-dashboard/package*.json ./apps/seller-dashboard/
COPY packages/ ./packages/
RUN npm ci

COPY apps/seller-dashboard/ ./apps/seller-dashboard/

ARG VITE_MEDUSA_URL=http://127.0.0.1:9001
ARG VITE_STOREFRONT_URL=http://127.0.0.1:3000
ARG VITE_STORE_ID=default_store
ARG VITE_PUBLISHABLE_API_KEY=
ENV VITE_MEDUSA_URL=$VITE_MEDUSA_URL
ENV VITE_STOREFRONT_URL=$VITE_STOREFRONT_URL
ENV VITE_STORE_ID=$VITE_STORE_ID
ENV VITE_PUBLISHABLE_API_KEY=$VITE_PUBLISHABLE_API_KEY

WORKDIR /app/apps/seller-dashboard
RUN npx vite build

FROM nginx:alpine
COPY --from=builder /app/apps/seller-dashboard/dist /usr/share/nginx/html
RUN printf '%s\n' \
  'server {' \
  '  listen 80;' \
  '  root /usr/share/nginx/html;' \
  '  index index.html;' \
  '  location / {' \
  '    try_files $uri $uri/ /index.html;' \
  '  }' \
  '}' > /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
