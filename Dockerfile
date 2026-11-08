# syntax=docker/dockerfile:1

# Stage 1: Base dependencies

FROM node:22-alpine AS base
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Development Server (Vite HMR + API Proxy on port 5173)
FROM base AS dev
COPY . .
ENV VITE_API_BASE_URL=/api/v1
ENV VITE_API_PROXY_TARGET=http://host.docker.internal:8000
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]

# Stage 3: Production Static Build
FROM base AS builder
COPY . .
ARG VITE_PROJECT_NAME=LazarusProtocol
ARG VITE_SITE_URL=https://lazarusprotocol.online
ARG VITE_API_BASE_URL=/api/v1
ARG VITE_STELLAR_NETWORK=TESTNET
ARG VITE_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
ARG VITE_LAZARUS_VAULT_CONTRACT_ID=CBKFA2F7RUDGLJNE3K5X2XEXVXRJQ5AMB2NSPREDTATE2ZHDALFKPGUR
ARG VITE_SAC_TOKEN_CONTRACT_ID=CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC
ARG VITE_ORACLE_PUBKEY=197f6b23e16c8532c6abc838facd5ea789be0c76b2920334039bfa8b3d368d61
ENV VITE_PROJECT_NAME=$VITE_PROJECT_NAME \
    VITE_SITE_URL=$VITE_SITE_URL \
    VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_STELLAR_NETWORK=$VITE_STELLAR_NETWORK \
    VITE_SOROBAN_RPC_URL=$VITE_SOROBAN_RPC_URL \
    VITE_LAZARUS_VAULT_CONTRACT_ID=$VITE_LAZARUS_VAULT_CONTRACT_ID \
    VITE_SAC_TOKEN_CONTRACT_ID=$VITE_SAC_TOKEN_CONTRACT_ID \
    VITE_ORACLE_PUBKEY=$VITE_ORACLE_PUBKEY
RUN npm run build

# Stage 4: Production Nginx Server (SPA + /api Reverse Proxy on port 80)
FROM nginx:1.27-alpine AS production
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
ENV INDEXER_UPSTREAM=https://api.lazarusprotocol.online \
    NGINX_ENVSUBST_FILTER=INDEXER_UPSTREAM
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:80/ || exit 1
CMD ["nginx", "-g", "daemon off;"]

