# ---- 1. ビルドステージ ----
FROM node:24-slim AS builder

WORKDIR /app

# ビルドに必要なもの
RUN apt-get update \
  && apt-get install -y python3 make g++  \
  && ln -sf /usr/bin/python3 /usr/bin/python \
  && rm -rf /var/lib/apt/lists/*

# pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# 依存解決に必要なファイルを先にコピー（ここが重要）
COPY pnpm-workspace.yaml ./
COPY pnpm-lock.yaml ./
COPY package.json ./

# workspace 配下の package.json を全てコピー（db を含める）
COPY packages/bot/package.json ./packages/bot/
COPY packages/db/package.json ./packages/db/
# 他にも packages/* があるなら同様に追加してください:
# COPY packages/xxx/package.json ./packages/xxx/

# ソースコードを全てコピー
COPY . .


# ここで install（tsc を含む devDependencies も入る）
RUN pnpm i


# ビルド
RUN pnpm build


# ---- 2. 実行ステージ（本番）----
FROM node:18-slim AS runner

RUN apt-get update \
  && apt-get install -y python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/packages ./packages



RUN pnpm install --prod --frozen-lockfile