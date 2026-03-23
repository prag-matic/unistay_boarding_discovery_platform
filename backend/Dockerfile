FROM node:lts-alpine

WORKDIR /app

# Install dependencies for Alpine
RUN apk add --no-cache openssl

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install -g pnpm
RUN pnpm install

# Copy source code
COPY tsconfig.json ./
COPY src ./src

# Build the application
RUN pnpm run build

# Default command (overridden in docker-compose for dev)
CMD ["pnpm", "start"]
