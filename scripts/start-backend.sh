#!/bin/sh
set -eu

# Apply upload limits only at runtime. Preserve Nixpacks' extension scan paths.
export PHP_INI_SCAN_DIR="${PHP_INI_SCAN_DIR:-}:$(pwd)/php/conf.d"

php artisan optimize:clear
php artisan storage:link --force
php artisan migrate --force
exec php artisan serve --host=0.0.0.0 --port="$PORT"
