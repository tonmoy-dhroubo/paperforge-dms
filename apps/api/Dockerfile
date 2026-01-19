FROM node:20-bookworm-slim

WORKDIR /app

ENV NODE_ENV=development
ENV npm_config_update_notifier=false

COPY package.json package-lock.json tsconfig.json ./
COPY apps/api/package.json apps/api/tsconfig.json apps/api/tsconfig.build.json ./apps/api/
COPY apps/api/src ./apps/api/src

RUN printf "nameserver 1.1.1.1\nnameserver 8.8.8.8\n" > /etc/resolv.conf \
  && npm ci --include=dev --no-audit --no-fund
RUN npm run api:build

ENV NODE_ENV=production

CMD ["npm", "run", "api:start"]

