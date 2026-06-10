FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --omit=dev --build-from-source=sqlite3

COPY . .
RUN mkdir -p /data \
  && chown -R node:node /app /data

USER node
ENV NODE_ENV=production
EXPOSE 3000

CMD ["npm", "start"]
