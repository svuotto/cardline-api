#!/bin/sh
set -e

echo "Running database migrations..."
npx typeorm migration:run -d dist/data-source.js

echo "Starting Cardline API..."
exec node dist/main.js
