#!/bin/sh

# Inject API_KEY into env-config.js
echo "window.ENV = { \"API_KEY\": \"$API_KEY\" };" > /usr/share/nginx/html/env-config.js

# Execute the CMD (nginx)
exec "$@"
