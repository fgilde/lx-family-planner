FROM node:24-bookworm-slim AS dependencies

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS build

COPY index.html vite.config.js ./
COPY public ./public
COPY src ./src
COPY shared ./shared
RUN npm run build

FROM node:24-bookworm-slim AS runtime

ENV NODE_ENV=production \
    PORT=3001 \
    DATABASE_FILE=/app/data/family_planner.sqlite \
    LEGACY_DATABASE_FILE=/app/data/family_db.json

WORKDIR /app

COPY package.json package-lock.json ./
RUN apt-get update \
    && apt-get install -y --no-install-recommends gosu \
    && rm -rf /var/lib/apt/lists/* \
    && npm ci --omit=dev \
    && npm cache clean --force \
    && mkdir -p /app/data /app/backups \
    && chown -R node:node /app

COPY --chown=node:node server.js ./
COPY --chown=node:node server ./server
COPY --chown=node:node shared ./shared
COPY --chown=node:node --from=build /app/dist ./dist
COPY --chown=node:node scripts/docker-entrypoint.sh /usr/local/bin/lx-family-entrypoint

ENV PUID=1000 \
    PGID=1000

EXPOSE 3001
VOLUME ["/app/data", "/app/backups"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3001/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

ENTRYPOINT ["/usr/local/bin/lx-family-entrypoint"]
CMD ["node", "server.js"]
