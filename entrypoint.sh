#!/bin/sh

mkdir -p /app

cp /app_build/chunk0* /app
cp -r /app_build/resources /app
cp -r /app_build/webui /app

cd /app

if [ -z "$PUID" ] || [ -z "$PGID" ]; then
  exec node chunk0.js
else
  adduser -u $PUID -D abc
  groupmod -g $PGID abc

  chown abc:abc -R /app

  su-exec abc node chunk0.js
fi
