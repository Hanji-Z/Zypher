# خدمنا بـ Node 20 باش يكون السيسيتيم جديد والروابط خدامين
FROM node:20-bookworm

# 1. تثبيت الأدوات الأساسية
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 2. تنصيب yt-dlp
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp

COPY . .
RUN npm install
EXPOSE 3000
CMD [ "node" ,"index.js" ]
