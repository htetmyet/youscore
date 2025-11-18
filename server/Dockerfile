# -----------------
# Build step
# -----------------
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src
COPY sql ./sql

RUN npm run build

# -----------------
# Production image
# -----------------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/sql ./sql

EXPOSE 8090
CMD ["node", "dist/index.js"]
