# Build and serve stage
FROM oven/bun:1.3-slim AS base
WORKDIR /app

# Build-time argument for API URL
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Set default port for Bun
ENV PORT=3000

# Copy package files and install dependencies
COPY package.json pnpm-lock.yaml* ./
RUN bun install

# Copy source code and build the application
COPY . .
RUN bun run build

# Internal port for SPA serving
EXPOSE 3000

# Serve the static files using Bun's built-in SPA support
CMD ["bun", "dist/index.html", "--host", "0.0.0.0"]
