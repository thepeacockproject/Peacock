FROM node:22.13.0-alpine3.21

RUN apk add --update su-exec shadow jq

RUN rm -rf /var/cache/apk/*

RUN mkdir /app_build
RUN mkdir /app_linux
WORKDIR /app_build

COPY . .

RUN chmod +x packaging/docker-build.sh
RUN chmod +x packaging/entrypoint.sh

RUN packaging/docker-build.sh

ENTRYPOINT ["./packaging/entrypoint.sh"]
