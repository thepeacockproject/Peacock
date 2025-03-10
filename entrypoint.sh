#!/bin/sh

mkdir -p /app

cp /app_build/chunk0* /app
cp -r /app_build/resources /app
cp -r /app_build/webui /app

cd /app

if [ -z "$PUID" ] || [ -z "$PGID" ]; then
  exec node chunk0.js
else
  EXISTING_USER=$(getent passwd "$PUID" | cut -d: -f1)
  EXISTING_GROUP=$(getent group "$PGID" | cut -d: -f1)

  if [ -z "$EXISTING_USER" ]; then
    adduser -u $PUID -D abc
    EXISTING_USER=abc
  fi

  if [ -z "$EXISTING_GROUP" ]; then
    groupmod -g $PGID abc
    EXISTING_GROUP=abc
  fi

  chown $EXISTING_USER:$EXISTING_GROUP -R /app

  su-exec $EXISTING_USER node chunk0.js
fi
