FROM node:20
# System dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    curl \
    git \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*
# Install yt-dlp
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux \
    -o /usr/local/bin/yt-dlp && chmod +x /usr/local/bin/yt-dlp
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
# Environment variables (set these in your server/docker-compose)
# ENV GEMINI_API_KEY=AIza...
EXPOSE 3000
CMD ["node", "index.js"]
