FROM node:20-alpine

WORKDIR /app

# Set environment to indicate we're running in Docker
ENV DOCKER_ENV=true

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy application code
COPY . .

# Copy pre-built dist folder
COPY dist ./dist

# Expose port
EXPOSE 3000

# Run dev server in Docker (for development)
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]