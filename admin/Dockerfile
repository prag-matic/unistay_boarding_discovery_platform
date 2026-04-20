# Build and serve stage
FROM oven/bun:1.3-slim AS base
WORKDIR /app

# Copy package files and install dependencies
COPY package.json pnpm-lock.yaml* ./
RUN bun install

# Copy source code and build the application
COPY . .
RUN bun run build

# Expose the port Bun will serve on
EXPOSE 3000

# Serve the static files using Bun's built-in SPA support
CMD ["bun", "dist/index.html", "--port", "$PORT", "--host", "0.0.0.0"]
