FROM docker.io/node:20-alpine AS builder

ARG VITE_API_URL
ARG VITE_WS_URL

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM docker.io/nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

# Minimal nginx config: just serve static SPA (API calls go directly via VITE_API_URL)
RUN echo 'server { \
    listen 80; \
    server_name localhost; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
