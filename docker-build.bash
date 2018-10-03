#!/bin/bash
set -e

npm install
bower install
grunt build

docker build -t dersimn/mqtt-admin .
docker build -t dersimn/mqtt-admin:armhf -f Dockerfile.armhf .
