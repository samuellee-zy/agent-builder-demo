# Stage 1: Build the React application
FROM node:18-alpine AS build

WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Serve with Node.js
FROM node:18-alpine

WORKDIR /app

# Copy package files and install production dependencies
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Copy server and built assets
COPY server/ ./server/
COPY --from=build /app/dist ./dist

# Expose port 8080
EXPOSE 8080

# Start the server
CMD ["node", "server/index.js"]
