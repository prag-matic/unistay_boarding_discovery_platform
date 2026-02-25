FROM node:lts-alpine

WORKDIR /app

# Install dependencies for Prisma (required for Alpine)
RUN apk add --no-cache openssl

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . ./

# Generate Prisma client (if schema exists)
RUN [ -f prisma/schema.prisma ] && npm run prisma:generate || true

# Build the application
RUN npm run build

# Default command (overridden in docker-compose for dev)
CMD ["npm", "start"]
