FROM node:20-slim AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install all deps (including devDependencies for tsc)
RUN npm install

# Copy source and IDL
COPY tsconfig.json ./
COPY src/ src/
COPY idl/ idl/

# Build TypeScript
RUN npm run build

# ── Production stage ──────────────────────────────────────────────────
FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

# Copy compiled JS from builder
COPY --from=builder /app/dist/ dist/
# Copy IDL (needed at runtime)
COPY --from=builder /app/idl/ idl/

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "dist/server.js"]
