FROM node:12-alpine

WORKDIR /app

COPY package*.json ./

ENV NODE_OPTIONS --max-old-space-size=4096

RUN apk add --no-cache --virtual .gyp \
        python \
        make \
        g++ \
        && apk del .gyp && yarn && yarn run bootstrap && yarn run build && yarn global add artillery

COPY . .

CMD echo "done"