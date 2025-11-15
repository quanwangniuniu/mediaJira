FROM python:3.10

WORKDIR /app

# Install system dependencies including ffmpeg
RUN apt-get update && apt-get install -y \
    mediainfo \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements.txt first to leverage Docker cache
COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .


CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "backend.asgi:application"] 