# syntax=docker/dockerfile:1

##############################
# 1. Install dependencies
##############################
FROM oven/bun:1 AS deps
WORKDIR /app

# Copy only manifest files first for better layer caching
COPY package.json bun.lock* ./

RUN bun install --frozen-lockfile

##############################
# 2. Build / assemble release image
##############################
FROM oven/bun:1 AS release
WORKDIR /app

ENV NODE_ENV=production

# Reuse installed node_modules from the deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy the rest of the source
COPY . .

# Render (and most PaaS providers) inject PORT at runtime.
# The app already reads process.env.PORT, so no hardcoding needed here.
EXPOSE 4000

# Run as the non-root "bun" user provided by the base image
USER bun

CMD ["bun", "run", "index.ts"]