FROM node:18-bookworm-slim

RUN apt update \
    && apt install -y --no-install-recommends \
        chromium-driver \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /app && chown node:node /app
WORKDIR /app

COPY --chown=node:node package*.json /app/
USER node
RUN npm install

COPY --chown=node:node . /app/

CMD ["node", "wallapop-docker.js"]
