# Stage 1: Build the Vite React application
FROM node:20-slim AS builder

WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install

# Copy application source code
COPY . .

# Build production bundle
RUN npm run build

# Stage 2: Serve static bundle with Nginx
FROM nginx:stable AS runner

# Copy custom Nginx configuration for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy production dist output from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
