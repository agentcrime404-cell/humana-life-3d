#!/bin/sh
# Avvia HUMANA life 3D sul Mac (porta 3079). Doppio clic dal Finder, oppure ./AVVIA-3D-MAC.command dal Terminale.
set -eu
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
 echo 'Installa Node.js 24 da nodejs.org, poi riapri questo file.'
 exit 1
fi
node -e "if(Number(process.versions.node.split('.')[0])<24){console.error('Serve Node.js 24 o successivo');process.exit(1)}"
[ -d node_modules ] || npm ci --no-audit --no-fund
(sleep 3; open "http://localhost:3079/") &
exec node --env-file-if-exists=.env scripts/play-3d.mjs
