#!/usr/bin/env bash
# Levanta el backend falso (json-server) en el puerto 3000.
cd "$(dirname "$0")"
json-server --watch db.json --routes routes.json --port 3900
