FROM node:12-alpine

WORKDIR /app

COPY package*.json ./

ENV NODE_OPTIONS --max-old-space-size=4096

RUN apk add --no-cache --virtual .gyp \
        python \
        make \
        g++ \
        && yarn install && apk del .gyp && npm i -g artillery

COPY . .

CMD yarn run bootstrap