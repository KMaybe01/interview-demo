# Stage 1: Build frontend
FROM oven/bun:1.3 AS frontend-builder
WORKDIR /app
COPY apps/frontend/package.json ./
RUN bun install
COPY apps/frontend/ .
RUN bun run build

# Stage 2: Build ai-demo
FROM oven/bun:1.3 AS ai-demo-builder
WORKDIR /app
COPY apps/ai-demo/package.json ./
RUN bun install
COPY apps/ai-demo/ .
RUN bun run build

# Stage 3: Build interview-docs
FROM oven/bun:1.3 AS interview-docs-builder
WORKDIR /app
COPY apps/interview-docs/package.json ./
RUN bun install
COPY apps/interview-docs/ .
COPY docs/ /docs/
RUN bun run build

# Stage 4: Build backend
FROM golang:1.26-alpine AS backend-builder
WORKDIR /app
COPY backend/go.* ./
RUN go mod download
COPY backend/ .
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o /server ./cmd/server/

# Stage 5: Frontend runtime
FROM nginx:alpine AS frontend
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=frontend-builder /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:80/ || exit 1

# Stage 6: AI Demo runtime
FROM nginx:alpine AS ai-demo
COPY nginx.ai-demo.conf /etc/nginx/conf.d/default.conf
COPY --from=ai-demo-builder /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:80/ || exit 1

# Stage 7: Interview docs runtime
FROM nginx:alpine AS interview-docs
COPY nginx.interview-docs.conf /etc/nginx/conf.d/default.conf
COPY --from=interview-docs-builder /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:80/ || exit 1

# Stage 8: Backend runtime
FROM alpine:3.19 AS backend
RUN apk --no-cache add ca-certificates tzdata wget
COPY --from=backend-builder /server /server
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:8080/healthz || exit 1
CMD ["/server"]
