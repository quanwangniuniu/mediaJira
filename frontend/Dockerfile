FROM node:18

WORKDIR /app

# Add non-root user
RUN adduser --disabled-password --gecos "" --home /home/appuser appuser && mkdir -p /home/appuser/.npm && chown -R appuser:appuser /home/appuser /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --prefix /home/appuser/.npm
ENV PATH=/home/appuser/.npm/bin:$PATH

# Copy source code
COPY . .

# Set environment variables for Next.js development
ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1

RUN chown -R appuser:appuser /app /home/appuser/.npm
USER appuser
ENV NPM_CONFIG_CACHE=/home/appuser/.npm

# Expose port
EXPOSE 3000

# Set environment variable
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start development server
CMD ["npm", "run", "dev"] 