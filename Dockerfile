# Use Node.js 20 Alpine for smaller image size
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache libc6-compat

# Copy package files
COPY package*.json ./

# Install root dependencies (includes dev deps needed for build)
RUN npm ci

# Copy source code
COPY . .
# Build the Docusaurus docs (install its own deps then build)
RUN cd docs-site \
  && npm ci \
  && npm run build \
  && cd ..

# Build the main application
RUN npm run build

# Expose port 3000 (server listens on 3000 by default)
EXPOSE 3000

# Production mode
ENV NODE_ENV=production

# Start the production server
CMD ["npm", "start"]