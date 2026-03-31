# Stage 1: Build
FROM node:22-alpine AS build
WORKDIR /app
# Copy root package files for workspace
COPY package*.json ./
COPY backend/package*.json ./backend/
RUN npm ci --workspace=backend
COPY backend/ ./backend/
RUN npm run build --workspace=backend

# Stage 2: Runtime
FROM node:22-alpine
WORKDIR /app
RUN addgroup -g 1001 -S appgroup && adduser -S appuser -u 1001 -G appgroup
COPY --from=build /app/backend/dist ./dist
COPY --from=build /app/backend/package*.json ./
RUN npm ci --omit=dev
USER appuser
EXPOSE 3000
CMD ["node", "dist/index.js"]
