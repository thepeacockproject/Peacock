# Stage 1: Build the application
FROM node:22.9.0-alpine AS builder

WORKDIR /app

# Install dependencies needed for building
RUN apk add --no-cache python3 make g++ gcc git

# Enable Corepack and prepare Yarn 4.7.0
RUN corepack enable && corepack prepare yarn@4.7.0 --activate

# Copy everything
COPY . .

# Install dependencies
RUN yarn install --immutable

# Build the project
RUN yarn build

# Stage 2: Create the production image
FROM node:22.9.0-alpine

WORKDIR /app

# Enable Corepack and prepare Yarn for production
RUN corepack enable && corepack prepare yarn@4.7.0 --activate

# Install tini for proper signal handling
RUN apk add --no-cache tini

# Copy the entire built application
COPY --from=builder /app /app

# Create userdata directory for persistent storage
RUN mkdir -p /app/userdata && chown -R node:node /app

# Switch to non-root user
USER node

EXPOSE 8080
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["yarn", "start"]
