FROM alpine:3.21.3

RUN apk add --update nodejs npm su-exec shadow

RUN rm -rf /var/cache/apk/*

RUN mkdir /app_build
WORKDIR /app_build
RUN npm i -g yarn

COPY . .

RUN yarn install && yarn run build

RUN chmod +x entrypoint.sh

ENTRYPOINT ["./entrypoint.sh"]
