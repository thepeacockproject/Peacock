# Stage 1: Build the application
FROM node:22.9.0-alpine AS builder

WORKDIR /app

# Install dependencies needed for building
RUN apk add --no-cache python3 make g++ gcc

# Enable Corepack and prepare Yarn 4.7.0
RUN corepack enable && corepack prepare yarn@4.7.0 --activate

# Copy package files and install dependencies
COPY package.json yarn.lock* ./
RUN yarn install --frozen-lockfile

# Copy the rest of the source code
COPY . .

# Compile TypeScript/Build the project
RUN yarn build

# Stage 2: Create the production image
FROM node:22.9.0-alpine

WORKDIR /app

# Enable Corepack and prepare Yarn for production (if needed)
RUN corepack enable && corepack prepare yarn@4.7.0 --activate

# Install tini for proper signal handling
RUN apk add --no-cache tini

# Copy only the built files and production dependencies
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

# Create userdata directory for persistent storage
RUN mkdir -p /app/userdata && chown -R node:node /app

# Switch to non-root user
USER node

# Peacock usually runs on port 8080 by default
EXPOSE 8080

# Use tini as entrypoint for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# Start the application
CMD ["node", "dist/index.js"]
