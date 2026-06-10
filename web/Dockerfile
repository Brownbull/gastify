# Build the Vite 8 SPA in a STANDARD Debian (glibc) Node image. Nixpacks' Nix-based
# environment makes npm skip the glibc-conditioned @rolldown/binding-linux-x64-gnu
# optional dep (Vite 8's Rolldown native binding), which broke the prod build; a
# standard glibc image resolves + installs it correctly. node:22 is >=22.12 (Vite 8 req).
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build

# Serve the static build with Caddy (keeps web/Caddyfile's security headers + SPA
# fallback). Caddy runs from /srv, so the Caddyfile's relative `root * dist` resolves
# to /srv/dist. Listens on :{$PORT} (Railway injects PORT).
FROM caddy:2-alpine
WORKDIR /srv
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv/dist
