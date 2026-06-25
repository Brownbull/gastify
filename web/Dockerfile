# Build the Vite 8 SPA in a STANDARD Debian (glibc) Node image. Nixpacks' Nix-based
# environment makes npm skip the glibc-conditioned @rolldown/binding-linux-x64-gnu
# optional dep (Vite 8's Rolldown native binding), which broke the prod build; a
# standard glibc image resolves + installs it correctly. node:22 is >=22.12 (Vite 8 req).
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps
COPY . .
# Vite inlines import.meta.env.VITE_* at BUILD time. Railway exposes the service's
# variables to the Docker build as build args — declare them as ARG (and export to
# ENV) so `vite build` bakes the API URL, Firebase web config, and the prod
# test-login flag into the bundle. Without these the SPA ships with undefined
# config and crashes on load. These VITE_* values are public client config (they
# ship in the bundle by design); the build stage is discarded in the final image.
ARG VITE_API_BASE_URL
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_STORAGE_BUCKET
ARG VITE_FIREBASE_MESSAGING_SENDER_ID
ARG VITE_FIREBASE_APP_ID
ARG VITE_PROD_TEST_AUTH_ENABLED
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY \
    VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN \
    VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID \
    VITE_FIREBASE_STORAGE_BUCKET=$VITE_FIREBASE_STORAGE_BUCKET \
    VITE_FIREBASE_MESSAGING_SENDER_ID=$VITE_FIREBASE_MESSAGING_SENDER_ID \
    VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID \
    VITE_PROD_TEST_AUTH_ENABLED=$VITE_PROD_TEST_AUTH_ENABLED
RUN npm run build

# Serve the static build with Caddy (keeps web/Caddyfile's security headers + SPA
# fallback). Caddy runs from /srv, so the Caddyfile's relative `root * dist` resolves
# to /srv/dist. Listens on :{$PORT} (Railway injects PORT).
FROM caddy:2-alpine
WORKDIR /srv
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv/dist
