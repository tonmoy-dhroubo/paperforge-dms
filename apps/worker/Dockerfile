FROM node:20-bookworm-slim

# Some environments have broken Docker DNS during build. Docker will overwrite
# /etc/resolv.conf at container start for each RUN layer, so set it inline.
RUN printf "nameserver 1.1.1.1\nnameserver 8.8.8.8\n" > /etc/resolv.conf \
  && apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    poppler-utils \
    tesseract-ocr \
    tesseract-ocr-eng \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=development
ENV npm_config_update_notifier=false

COPY package.json package-lock.json tsconfig.json ./
COPY apps/api/package.json apps/api/tsconfig.json apps/api/tsconfig.build.json ./apps/api/
COPY apps/worker/package.json apps/worker/tsconfig.json apps/worker/tsconfig.build.json ./apps/worker/
COPY apps/worker/src ./apps/worker/src

RUN printf "nameserver 1.1.1.1\nnameserver 8.8.8.8\n" > /etc/resolv.conf \
  && npm ci --include=dev --no-audit --no-fund
RUN npm run worker:build

CMD ["npm", "run", "worker:start"]
