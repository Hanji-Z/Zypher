const { execFile, exec } = require("child_process");
const https = require("https");
const http = require("http");
const fs = require("fs-extra");
const path = require("path");
const os = require("os");

const YTDLP_CACHE = path.join(os.tmpdir(), "yt-dlp-standalone");
const YTDLP_URL = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux";
const YTDLP_PATHS = [
  "/home/runner/workspace/.pythonlibs/bin/yt-dlp",
  "/usr/local/bin/yt-dlp",
  "/usr/bin/yt-dlp",
  YTDLP_CACHE
];

function downloadFile(url, dest, r = 0) {
  if (r > 5) return Promise.reject(new Error("too many redirects"));
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    client.get(url, res => {
      if ([301, 302].includes(res.statusCode)) {
        return downloadFile(res.headers.location, dest, r + 1).then(resolve).catch(reject);
      }
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on("finish", resolve);
      file.on("error", reject);
    }).on("error", reject);
  });
}

async function getYtdlp() {
  for (const p of YTDLP_PATHS) {
    if (fs.existsSync(p)) {
      try {
        await new Promise((res, rej) => execFile(p, ["--version"], (e) => e ? rej(e) : res()));
        return p;
      } catch {}
    }
  }
  await downloadFile(YTDLP_URL, YTDLP_CACHE);
  fs.chmodSync(YTDLP_CACHE, "755");
  return YTDLP_CACHE;
}

function runCommand(bin, args) {
  return new Promise((resolve, reject) => {
    execFile(bin, args, { maxBuffer: 1024 * 1024 * 50 }, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr || err.message));
      resolve(stdout.trim());
    });
  });
}

function formatDuration(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

module.exports = {
  config: {
    name: "play",
    aliases: ["mp3", "yta", "ytmp3"],
    version: "2.1.0",
    author: "Hanji",
    countDown: 10,
    role: 0,
    category: "MEDIA",
    shortDescription: { en: "Download YouTube as audio only" },
    longDescription: { en: "Search YouTube by name (or paste a URL) and receive the audio." },
    guide: { en: "{pn} <اسم الأغنية | YouTube URL>" }
  },

  onStart: async function ({ api, event, args, message }) {
    const { threadID, messageID } = event;

    if (!args.length) {
      return message.reply(
        "🎵 كيفاش تستعمل:\n" +
        "• play <اسم الأغنية>\n" +
        "• play <رابط يوتوب>\n\n" +
        "أمثلة:\n" +
        "• play eminem lose yourself\n" +
        "• play https://youtu.be/XXXXXXX"
      );
    }

    api.setMessageReaction("⏳", messageID, () => {}, true);

    const input = args.join(" ").trim();
    const isUrl = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be|m\.youtube\.com)/i.test(input);
    const searchTarget = isUrl ? input : `ytsearch1:${input}`;

    try {
      const ytdlp = await getYtdlp();

      const jsonRaw = await runCommand(ytdlp, [
        "--no-playlist", "--dump-json", searchTarget
      ]);
      const info = JSON.parse(jsonRaw);

      const title = info.title || "Unknown";
      const channel = info.uploader || info.channel || "Unknown";
      const lengthSec = info.duration || 0;
      const durationStr = formatDuration(lengthSec);
      const videoUrl = info.webpage_url || info.url;

      if (lengthSec > 600) {
        api.setMessageReaction("❌", messageID, () => {}, true);
        return message.reply(`❌ الأغنية طويلة بزاف (${durationStr}). الحد الأقصى 10 دقايق.`);
      }

      const cacheDir = path.join(__dirname, "cache");
      fs.ensureDirSync(cacheDir);
      const filePath = path.join(cacheDir, `play_${Date.now()}.mp3`);

      await runCommand(ytdlp, [
        "--no-playlist",
        "-x", "--audio-format", "mp3", "--audio-quality", "5",
        "-o", filePath,
        videoUrl
      ]);

      if (!fs.existsSync(filePath)) throw new Error("الملف ما تحملش");

      const stats = fs.statSync(filePath);
      const sizeMB = stats.size / (1024 * 1024);

      if (sizeMB > 25) {
        fs.unlinkSync(filePath);
        api.setMessageReaction("❌", messageID, () => {}, true);
        return message.reply(`❌ الملف كبير بزاف (${sizeMB.toFixed(1)} MB). فيسبوك يقبل غير 25 MB.`);
      }

      api.setMessageReaction("✅", messageID, () => {}, true);

      await api.sendMessage(
        {
          body: `🎵 ${title}\n👤 ${channel}\n⏱️ ${durationStr}\n📦 ${sizeMB.toFixed(2)} MB\n🔗 ${videoUrl}`,
          attachment: fs.createReadStream(filePath)
        },
        threadID,
        () => { try { fs.unlinkSync(filePath); } catch {} },
        messageID
      );

    } catch (err) {
      console.error("Play Error:", err);
      api.setMessageReaction("❌", messageID, () => {}, true);
      return message.reply(
        `❌ ضرب مشكل:\n${err.message || "خطأ غير معروف"}\n\n` +
        `💡 جرب اسم آخر أو رابط مباشر.`
      );
    }
  }
};
