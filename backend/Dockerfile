FROM python:3.10

WORKDIR /app

# Copy requirements.txt first to leverage Docker cache
COPY requirements.txt .

COPY . .

# Install system dependencies including ffmpeg
RUN apt-get update && apt-get install -y \
    mediainfo \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir -r requirements.txt

# Add non-root user(Debian/Ubuntu)
RUN adduser --disabled-password --gecos "" appuser
RUN chown -R appuser:appuser /app
USER appuser

CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "backend.asgi:application"] 