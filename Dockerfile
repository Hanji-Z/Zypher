FROM node:20-bookworm

# 1. تثبيت ffmpeg و python و pip
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# 2. تثبيت yt-dlp بـ pip (أضمن طريقة فـ ريلايواي دابا)
RUN pip3 install --break-system-packages yt-dlp

COPY . .
RUN npm install
EXPOSE 3000
CMD [ "node" ,"index.js" ]
