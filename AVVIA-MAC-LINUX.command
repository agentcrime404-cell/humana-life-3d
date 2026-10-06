#!/bin/sh
set -eu
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
 echo 'Installa Node.js 24 da nodejs.org, poi riapri questo file.'
 exit 1
fi
node -e "if(Number(process.versions.node.split('.')[0])<24){console.error('Serve Node.js 24 o successivo');process.exit(1)}"
npm ci --omit=dev --no-audit --no-fund
exec node --env-file-if-exists=.env scripts/play.mjs
