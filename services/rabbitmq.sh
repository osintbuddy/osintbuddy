#!/bin/bash
set -e

# Wait for RabbitMQ to start
rabbitmq-server -detached
rabbitmqctl wait /var/lib/rabbitmq/mnesia/rabbit@$(hostname).pid

# Create default vhost if it doesn't exist
rabbitmqctl add_vhost / || true

# Set permissions for guest user on default vhost
rabbitmqctl set_permissions -p / guest ".*" ".*" ".*"

# Stop the detached server
rabbitmqctl stop

# Start normally
exec rabbitmq-server