FROM nginx:alpine

# Copy static app files
COPY apps/averi-mobile /usr/share/nginx/html

# SPA nginx config (try_files fallback to index.html)
COPY apps/nginx.spa.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
HEALTHCHECK --interval=15s --timeout=5s --retries=3 CMD wget -qO- http://localhost/index.html || exit 1

CMD ["nginx", "-g", "daemon off;"]
