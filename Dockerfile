# One-command demo image: builds the whole monorepo, seeds a fresh SQLite DB on
# start, serves the API (tRPC) on :3001 and the built SPA on :5173.
#
#   docker compose up --build        # then open http://localhost:5173
#
# This is the local/demo runtime. The AWS "golden path" (apps/api/handler.ts +
# apps/api/cdk + apps/web/amplify.yml) is the production path: cdk:synth emits the
# CloudFormation; only the SQLite -> DynamoDB swap in packages/db remains.
FROM node:20-slim

# Prisma's query engine needs openssl present in the image.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable

WORKDIR /app

# Install workspace deps (devDeps included — needed for prisma, tsc, vite, tsx).
# .dockerignore keeps host node_modules / *.db out so the install is clean.
COPY . .
RUN pnpm install --frozen-lockfile

# Bake the browser-facing API URL into the SPA at build time (Vite inlines VITE_*).
# Default to a same-origin `/trpc` so a plain image build (what Render does) has the
# SPA call the API on the same host/port. docker-compose overrides this with the
# absolute two-port dev URL (http://localhost:3001/trpc).
ARG VITE_API_URL=/trpc
ENV VITE_API_URL=$VITE_API_URL

# Absolute SQLite path so the Prisma CLI, the seed, and the runtime client all
# agree regardless of the process working directory.
ENV DATABASE_URL=file:/app/packages/db/prisma/dev.db
ENV PORT=3001
ENV WEB_ORIGIN=http://localhost:5173

# turbo build: shared -> db (prisma generate + tsc) -> api (tsc) -> web (vite build).
# (.dockerignore drops *.tsbuildinfo so tsc does a clean full emit, not an
# incremental skip against the host's stale build-info.)
RUN pnpm build

EXPOSE 5173 3001

# Seed a fresh DB, start the API in the background, then serve the built SPA.
CMD ["sh", "-lc", "pnpm --filter @agent-network/db db:push && pnpm --filter @agent-network/db db:seed && (node apps/api/dist/server.js &) && pnpm --filter @agent-network/web exec vite preview --host 0.0.0.0 --port 5173 --strictPort"]
