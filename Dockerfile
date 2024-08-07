FROM node:latest

WORKDIR /Apps/whatsapp

#RUN apt-get update && \
#  apt-get install -y \
#  chromium \
#  libatk-bridge2.0-0 \
#  libxkbcommon0 \
#  libwayland-client0 \
#  libgtk-3-0 && \
#  rm -rf /var/lib/apt/lists/*

RUN apt-get update && apt install -y vim wget nano gconf-service libgbm-dev libasound2 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils wget chromium

COPY package.json .

RUN npm install whatsapp-web.js
RUN npm install
RUN npm i qrcode-terminal express time-stamp axios request valid-url dotenv mongodb mysql
RUN npm install github:pedroslopez/whatsapp-web.js#webpack-exodus

COPY . .

RUN cp env.example .env

#ENV NEW_RELIC_NO_CONFIG_FILE=true
#ENV NEW_RELIC_DISTRIBUTED_TRACING_ENABLED=true \
#NEW_RELIC_LOG=stdout
# etc.

EXPOSE 2100

CMD ["node", "app.js"]
