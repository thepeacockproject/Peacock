FROM node:22.13.0-alpine3.21

RUN apk add --update su-exec shadow

RUN rm -rf /var/cache/apk/*

RUN mkdir /app_build
WORKDIR /app_build

COPY . .

RUN yarn install && yarn run build

RUN chmod +x entrypoint.sh

ENTRYPOINT ["./entrypoint.sh"]
