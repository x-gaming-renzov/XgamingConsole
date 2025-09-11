# Use Node.js 20 Alpine for smaller image size
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache libc6-compat

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies)
RUN npm ci

# Copy source code
COPY . .
# Build the Docusaurus docs
RUN cd docs-site \
	&& npm ci \
	&& npm run build \
	&& cd ..

# Build the main application
RUN npm run build

# Expose port 3000 (as configured in server/index.ts)
EXPOSE 3000

# Set environment variables - KEEP AS DEVELOPMENT
ENV NODE_ENV=development

# Start the application
CMD ["npm", "run", "dev"]