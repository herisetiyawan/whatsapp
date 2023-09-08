FROM node:latest

WORKDIR /Apps/whatsapp

RUN apt-get update && \
  apt-get install -y \
  chromium \
  libatk-bridge2.0-0 \
  libxkbcommon0 \
  libwayland-client0 \
  libgtk-3-0 && \
  rm -rf /var/lib/apt/lists/*

COPY package.json .

RUN npm install
RUN npm i qrcode-terminal express time-stamp axios request jq valid-url

COPY . .

#ENV NEW_RELIC_NO_CONFIG_FILE=true
#ENV NEW_RELIC_DISTRIBUTED_TRACING_ENABLED=true \
#NEW_RELIC_LOG=stdout
# etc.

EXPOSE 2100

CMD ["node", "app.js"]
