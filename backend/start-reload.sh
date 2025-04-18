#!/usr/bin/env sh
set -e

if [ -f ./app/app/main.py ]; then
    DEFAULT_MODULE_NAME=app.app.main
    elif [ -f ./app/main.py ]; then
    DEFAULT_MODULE_NAME=app.main
else
    DEFAULT_MODULE_NAME=app.main
fi
MODULE_NAME=${MODULE_NAME:-$DEFAULT_MODULE_NAME}
VARIABLE_NAME=${VARIABLE_NAME:-app}
export APP_MODULE=${APP_MODULE:-"$MODULE_NAME:$VARIABLE_NAME"}

HOST=${HOST:-0.0.0.0}
PORT=${PORT:-80}
LOG_LEVEL=${LOG_LEVEL:-info}

# If there's a prestart.sh script in the /app directory or other path specified, run it before starting
PRE_START_PATH=${PRE_START_PATH:-./prestart.sh}
echo "Checking for script in $PRE_START_PATH"
if [ -f $PRE_START_PATH ] ; then
    echo "Running script $PRE_START_PATH"
    /bin/sh -c "$PRE_START_PATH"
else
    echo "There is no script $PRE_START_PATH"
fi


python3 -m debugpy --listen 0.0.0.0:3001 ./app/start.py "app.main:app"