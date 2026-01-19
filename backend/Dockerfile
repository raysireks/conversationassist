# Use PyTorch base image (includes Torch + CUDA) to avoid massive downloads
FROM pytorch/pytorch:2.2.0-cuda12.1-cudnn8-runtime

# Set working directory
WORKDIR /app

# Install Python and dependencies
RUN apt-get update && apt-get install -y \
    python3-pip \
    python3-dev \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python packages
# Upgrade pip first to avoid dependency resolution errors
RUN pip3 install --upgrade pip

RUN pip3 install --default-timeout=1000 --retries=20 -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Run the application
CMD ["python3", "main.py"]
