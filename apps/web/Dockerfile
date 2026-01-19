FROM node:20-bookworm-slim

WORKDIR /app

ENV npm_config_update_notifier=false
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json tsconfig.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/worker/package.json ./apps/worker/package.json
COPY apps/web/package.json apps/web/tsconfig.json apps/web/next.config.mjs apps/web/next-env.d.ts ./apps/web/
COPY apps/web/src ./apps/web/src

RUN printf "nameserver 1.1.1.1\nnameserver 8.8.8.8\n" > /etc/resolv.conf \
  && npm ci --include=dev --no-audit --no-fund

ENV NODE_ENV=production

RUN npm -w @paperforge/web run build

CMD ["npm", "-w", "@paperforge/web", "run", "start"]
