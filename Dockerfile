FROM node:18-bookworm

RUN apt update \
    && apt install -y --no-install-recommends \
        chromium chromium-driver \
        libx11-xcb1 libxcomposite1 libatk1.0-0 libatk-bridge2.0-0 libcairo2 \
        libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgbm1 libgcc1 \
        libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 \
        libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 \
        libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 \
        libxtst6 \
    && rm -rf /etc/apt/lists/*

RUN mkdir -p /app && chown node:node /app
WORKDIR /app

COPY --chown=node:node package*.json /app/
USER node
RUN npm install

COPY --chown=node:node . /app/

CMD ["node", "wallapop-docker.js"]
