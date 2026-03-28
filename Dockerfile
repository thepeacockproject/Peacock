# Stage 1: Build the application
FROM node:22.9.0-alpine AS builder

WORKDIR /app

# Install dependencies needed for building
RUN apk add --no-cache python3 make g++ gcc

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

# Copy only the built files and production dependencies
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

# Peacock usually runs on port 3000 or 8080 by default
EXPOSE 8080

CMD ["node", "dist/index.js"]
