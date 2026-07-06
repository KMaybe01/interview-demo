# Stage 1: Build frontend
FROM oven/bun:1.3 AS frontend-builder
WORKDIR /app
COPY apps/frontend/package.json apps/frontend/bun.lock* ./
RUN bun install --frozen-lockfile
COPY apps/frontend/ .
RUN bun run build

# Stage 2: Build interview-docs
FROM oven/bun:1.3 AS interview-docs-builder
WORKDIR /app
COPY apps/interview-docs/package.json apps/interview-docs/bun.lock* ./
RUN bun install --frozen-lockfile
COPY apps/interview-docs/ .
COPY docs/ /docs/
RUN bun run build

# Stage 3: Build backend
FROM golang:1.26-alpine AS backend-builder
WORKDIR /app
COPY backend/go.* ./
RUN go mod download
COPY backend/ .
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o /server ./cmd/server/

# Stage 4: Frontend runtime
FROM nginx:alpine AS frontend
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=frontend-builder /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:80/ || exit 1

# Stage 5: Interview docs runtime
FROM nginx:alpine AS interview-docs
COPY nginx.interview-docs.conf /etc/nginx/conf.d/default.conf
COPY --from=interview-docs-builder /app/dist /usr/share/nginx/html/interview-demo
EXPOSE 80
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:80/interview-demo/ || exit 1

# Stage 6: Backend runtime
FROM alpine:3.19 AS backend
RUN apk --no-cache add ca-certificates tzdata wget
COPY --from=backend-builder /server /server
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:8080/healthz || exit 1
CMD ["/server"]
