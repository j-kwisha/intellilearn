#!/bin/sh
set -eu

php artisan optimize:clear
php artisan storage:link --force
php artisan migrate --force

# Pass limits to the actual HTTP process without changing PHP's extension paths.
# Use the same router as artisan serve, from its expected public directory.
cd public
exec php -d upload_max_filesize=100M -d post_max_size=110M \
    -S "0.0.0.0:$PORT" ../vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php
