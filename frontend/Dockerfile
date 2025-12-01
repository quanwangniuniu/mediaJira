FROM node:18

WORKDIR /app

# Copy package files
COPY package*.json ./

# Copy source code
COPY . .

# Install dependencies
RUN npm install


# Add non-root user
# RUN adduser --disabled-password --gecos "" appuser
# RUN chown -R appuser:appuser /app
# USER appuser


# Set environment variables for Next.js development
ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1

# Expose port
EXPOSE 3000

# Set environment variable
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start development server
CMD ["npm", "run", "dev"] 