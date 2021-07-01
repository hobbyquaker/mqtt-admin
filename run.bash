#!/bin/bash
set -e

CONFIG_PATH="/etc/nginx/nginx.conf"

# Get settings
if [ -f /ssl/nginx.key ] && [ -f /ssl/nginx.crt ]; then
	export ENABLE_HTTPS=1
fi
if [ -f /ssl/client.crt ]; then
	export SSL_CLIENT_AUTH=1
fi
if [ -f /ssl/client.crl ]; then
	export SSL_CLIENT_AUTH_CRL=1
fi
if [[ -z "${HTTPS_REDIRECT_PORT}" ]]; then
	HTTPS_REDIRECT_PORT=""
else
	HTTPS_REDIRECT_PORT=":${HTTPS_REDIRECT_PORT}"
fi

# Build Config
cat /nginx.template | mo > ${CONFIG_PATH}

# Run
cat ${CONFIG_PATH} 
exec nginx -g "daemon off;"
