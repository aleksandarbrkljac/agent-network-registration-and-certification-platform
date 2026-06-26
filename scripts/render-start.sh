#!/usr/bin/env sh
# Render start command for the single web service.
#
# Kept as a committed script (not an inline `sh -lc "...&&..."` in render.yaml)
# because Render word-splits the dockerCommand value, and nested quotes around an
# `&&` chain get passed to the shell as a single quoted word — which dash then
# tries to exec as one program, failing with `... : not found` (exit 127).
#
# Render injects $PORT; apps/api/dist/server.js reads it and binds 0.0.0.0.
# The free plan's filesystem is ephemeral, so the demo SQLite DB is re-pushed and
# re-seeded on every cold start. That is acceptable for this demo.
set -e

pnpm --filter @agent-network/db db:push
pnpm --filter @agent-network/db db:seed
node apps/api/dist/server.js
