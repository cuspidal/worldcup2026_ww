#!/bin/sh
set -e

# Ensure the /data volume mount is writable by the node user.
# Volume mounts override build-time chown, so we fix permissions at runtime
# before dropping privileges to the node user.
chown -R node:node /data

exec gosu node "$@"
