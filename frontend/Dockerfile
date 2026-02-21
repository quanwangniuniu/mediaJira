FROM node:18
WORKDIR /app

# Create non-root user
RUN adduser --disabled-password --gecos "" --home /home/appuser appuser
RUN mkdir -p /app/.next && chown -R appuser:appuser /app/.next

# Copy package.json
COPY package*.json ./


ENV SHARP_IGNORE_GLOBAL_LIBVIPS=1

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Build production bundle
RUN npm run build

# Assign permission
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["npm", "start"]
