FROM node:lts-alpine

WORKDIR /app

# Install dependencies for Prisma (required for Alpine)
RUN apk add --no-cache openssl

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy Prisma schema
COPY prisma ./prisma/

# Generate Prisma client
RUN npm run prisma:generate

# Copy source code (excluding seed.ts from production build)
COPY tsconfig.json ./
COPY src ./src

# Build the application
RUN npm run build

# Default command (overridden in docker-compose for dev)
CMD ["npm", "start"]
