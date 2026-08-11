FROM node:20-bookworm-slim AS builder
WORKDIR /app

# Install curl for healthchecks in the runtime image stage as well.
RUN apt-get update && apt-get install -y --no-install-recommends curl \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY apps/medusa-backend/package.json ./apps/medusa-backend/
COPY packages ./packages

RUN npm ci --workspace=@ai-commerce/medusa-backend --include-workspace-root

COPY apps/medusa-backend ./apps/medusa-backend
COPY tsconfig*.json ./

# Pin declared Medusa major/minor via lockfile; do not let npm float to unrelated majors.
WORKDIR /app/apps/medusa-backend
RUN npx medusa build

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update && apt-get install -y --no-install-recommends curl \
  && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app /app
WORKDIR /app/apps/medusa-backend

EXPOSE 9000
CMD ["npx", "medusa", "start"]
