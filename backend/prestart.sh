#! /usr/bin/env sh

## Let the DB start
python app/backend_pre_start.py

# alembic revision --autogenerate -m "initial revision"

## Run migrations
alembic upgrade head
