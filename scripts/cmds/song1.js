const { execFile, exec } = require("child_process");
const axios = require("axios");
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

async function downloadFile(url, dest) {
  const res = await axios.get(url, { responseType: "stream", maxRedirects: 5, timeout: 120000 });
  return new Promise((resolve, reject) => {
    const ws = fs.createWriteStream(dest);
    res.data.pipe(ws);
    ws.on("finish", resolve);
    ws.on("error", reject);
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

function ytArgs(extra = []) {
  return [
    "--extractor-args", "youtube:player_client=android",
    "--js-runtimes", `node:${process.execPath}`,
    ...extra
  ];
}

function friendlyError(err) {
  const msg = err.message || "";
  if (msg.includes("Sign in to confirm")) return "YouTube طلب تسجيل الدخول — عاود المحاولة بعد قليل.";
  if (msg.includes("Video unavailable")) return "الفيديو غير متاح أو محذوف.";
  if (msg.includes("Private video")) return "الفيديو خاص ولا يمكن تحميله.";
  if (msg.includes("not found") || msg.includes("ما لقيت")) return "ما لقيت حتى نتيجة لهذا البحث.";
  if (msg.includes("too large") || msg.includes("كبير")) return "الملف كبير بزاف — جرب أغنية أقصر.";
  return "وقع مشكل في التحميل — عاود المحاولة أو جرب اسم آخر.";
}

function formatDuration(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

module.exports = {
  config: {
    name: "play",
    aliases: ["mp36", "yta7", "ytmp36"],
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
        "--no-playlist", "--dump-json", ...ytArgs(), searchTarget
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
      const fileBase = path.join(cacheDir, `play_${Date.now()}`);

      await runCommand(ytdlp, [
        "--no-playlist",
        "-f", "bestaudio[acodec^=mp4a]/18/best",
        ...ytArgs(),
        "-o", `${fileBase}.%(ext)s`,
        videoUrl
      ]);

      const filePath = ["mp4", "m4a", "webm", "mp3"].map(e => `${fileBase}.${e}`).find(f => fs.existsSync(f));
      if (!filePath) throw new Error("الملف ما تحملش");

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
      console.error("Play Error:", err.message?.substring(0, 300));
      api.setMessageReaction("❌", messageID, () => {}, true);
      return message.reply(`❌ ${friendlyError(err)}`);
    }
  }
};
