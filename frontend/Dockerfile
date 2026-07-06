# --- Build stage ---
# Debian (glibc), not alpine (musl): Vite 8's rolldown and oxlint ship native
# binaries that fail to install under musl ("npm error Exit handler never called").
FROM node:22-slim AS build
WORKDIR /app

# VITE_API_URL is baked into the bundle at build time (the browser calls it directly).
# Override with: docker compose build --build-arg VITE_API_URL=http://localhost:8000
ARG VITE_API_URL=http://localhost:8000
ENV VITE_API_URL=$VITE_API_URL

COPY package*.json ./
RUN npm ci
COPY . .
# Write the build-time env explicitly so Vite bakes the API URL into the bundle
# (the local .env is excluded via .dockerignore).
RUN echo "VITE_API_URL=$VITE_API_URL" > .env
RUN npm run build

# --- Serve stage ---
FROM nginx:alpine AS serve
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
