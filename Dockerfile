FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for sqlite3
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libc6-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements from backend/ subdirectory
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy ALL backend Python files into container
COPY backend/models.py .
COPY backend/database.py .
COPY backend/main.py .

EXPOSE 8080

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]