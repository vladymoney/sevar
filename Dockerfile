# SEVAR (Тим Трейд ООД) — Node server: static site + API + admin panel
FROM node:24-alpine
ENV NODE_ENV=production PORT=3000 DATA_DIR=/app/data
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY server ./server
COPY admin ./admin
COPY js ./js
COPY css ./css
COPY assets ./assets
COPY *.html ./
# the SQLite database lives in a volume; create the folder owned by the unprivileged "node" user,
# otherwise Docker creates the volume root-owned and the server cannot write sevar.db
RUN mkdir -p /app/data && chown -R node:node /app/data
VOLUME /app/data
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null || exit 1
EXPOSE 3000
USER node
CMD ["node", "server/index.js"]
