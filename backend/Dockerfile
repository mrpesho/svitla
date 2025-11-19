FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create uploads directory
RUN mkdir -p /app/uploads

# Default port (Railway provides $PORT)
ENV PORT=5000

# Run with gunicorn using dynamic port
CMD gunicorn --bind 0.0.0.0:$PORT --workers 2 wsgi:app
