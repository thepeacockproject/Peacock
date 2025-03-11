#!/bin/sh

VERSION=$(jq -r '.version' package.json)
BUILD_DIR=Peacock-v"$VERSION"-linux

cp -r "$BUILD_DIR"/* /app_linux