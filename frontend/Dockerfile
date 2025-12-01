FROM node:18

WORKDIR /app

# Copy package files first for better caching
COPY package.json package-lock.json* ./

# Copy the rest of the application
COPY . .

# Install dependencies
RUN npm install
RUN npm install -g sonarqube-scanner 
RUN apt-get update && apt-get install -y curl

# Add non-root user
RUN adduser --disabled-password --gecos "" appuser
RUN chown -R appuser:appuser /app
USER appuser


# Set environment variables for Next.js development
ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1

# Expose port
EXPOSE 3000

# Start the development server with hot reloading
CMD ["npm", "run", "dev"] 