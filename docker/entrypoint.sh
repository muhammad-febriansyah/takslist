#!/usr/bin/env bash

set -Eeuo pipefail

cd /var/www/html

mkdir -p \
    storage/app/private \
    storage/app/public \
    storage/framework/cache/data \
    storage/framework/sessions \
    storage/framework/testing \
    storage/framework/views \
    storage/logs \
    bootstrap/cache

chown -R www-data:www-data storage bootstrap/cache

php artisan storage:link --force

if [[ "${RUN_MIGRATIONS:-false}" == "true" ]]; then
    php artisan migrate --force
fi

php artisan optimize

exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
