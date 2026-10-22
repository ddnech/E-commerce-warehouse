#!/bin/sh
set -e

# Run migrations and seeders before the API starts.
tries=0
until npx sequelize-cli db:migrate; do
  tries=$((tries + 1))
  if [ "$tries" -ge 10 ]; then
    echo "Database still not ready after $tries tries, giving up."
    exit 1
  fi
  echo "Database not ready yet, retrying in 3s..."
  sleep 3
done

# Seeders only run once (they're tracked in the SequelizeData table).
# Roles, regions and the super admin are always added. SEED_DEMO_DATA=false skips the demo shop.
npx sequelize-cli db:seed:all

exec "$@"
