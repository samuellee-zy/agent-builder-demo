# ==========================================
# STAGE 1: Build the React Application
# This stage builds the frontend React application.
# We use a Node.js base image to install dependencies and run the build process.
# The output (static files) will be copied to the next stage.
# ==========================================
FROM node:18-alpine AS builder
WORKDIR /app

# Install dependencies (cached if package.json hasn't changed)
# Copy package.json and package-lock.json first to leverage Docker's layer caching.
# If these files don't change, npm install won't re-run on subsequent builds.
COPY package*.json ./
RUN npm install

# Copy source code and build
# Copy the rest of the application code and then build the React app.
COPY . .
RUN npm run build

# ==========================================
# STAGE 2: Production Server
# This stage sets up a lightweight Node.js server to serve the built React app
# and handle API requests. It only includes production dependencies.
# ==========================================
FROM node:18-alpine
RUN npm ci --only=production

# Copy server and built assets
COPY server/ ./server/
COPY --from=build /app/dist ./dist

# Expose port 8080
EXPOSE 8080

# Start the server
CMD ["node", "server/index.js"]
