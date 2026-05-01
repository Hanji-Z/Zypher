const { execFile } = require("child_process");
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

module.exports = {
  config: {
    name: "song",
    aliases: ["music", "اغنية"],
    version: "7.1.0",
    author: "Zypher",
    countDown: 20,
    role: 0,
    category: "MEDIA",
    shortDescription: { en: "Download full song from YouTube" },
    guide: { en: "{pn} [song name]" }
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID } = event;
    const sidebar = "█║ ";
    const line = "█║──────────────────";
    const query = args.join(" ");

    if (!query) return;

    api.setMessageReaction("⏳", messageID, () => {}, true);

    try {
      const ytdlp = await getYtdlp();

      const jsonRaw = await runCommand(ytdlp, [
        "--no-playlist", "--dump-json", `ytsearch1:${query}`
      ]);
      const info = JSON.parse(jsonRaw);

      const title = info.title || query;
      const channel = info.uploader || info.channel || "Unknown";
      const durationSec = info.duration || 0;
      const minutes = Math.floor(durationSec / 60);
      const seconds = durationSec % 60;
      const durationStr = `${minutes}:${String(seconds).padStart(2, "0")}`;
      const videoUrl = info.webpage_url || info.url;

      const cachePath = path.join(__dirname, "cache");
      fs.ensureDirSync(cachePath);
      const filePath = path.join(cachePath, `song_${Date.now()}.mp3`);

      await runCommand(ytdlp, [
        "--no-playlist",
        "-x", "--audio-format", "mp3", "--audio-quality", "5",
        "-o", filePath,
        videoUrl
      ]);

      if (!fs.existsSync(filePath)) throw new Error("الملف ما تحملش");

      const sizeMB = (fs.statSync(filePath).size / (1024 * 1024)).toFixed(2);

      await api.sendMessage({
        body: `[ 𝗭𝗬𝗣𝗛𝗘𝗥 - 𝗔𝗨𝗗𝗜𝗢 ]\n${line}\n${sidebar}❯ 🎵 Track: ${title}\n${sidebar}❯ 👤 Channel: ${channel}\n${sidebar}❯ ⏳ Duration: ${durationStr}\n${sidebar}❯ 📦 Size: ${sizeMB} MB\n${line}\n${sidebar}[ 𝗦𝗬𝗦𝗧𝗘𝗠 𝗢𝗣𝗘𝗥𝗔𝗧𝗜𝗢𝗡𝗔𝗟 ]`,
        attachment: fs.createReadStream(filePath)
      }, threadID, messageID);

      api.setMessageReaction("✅", messageID, () => {}, true);

      setTimeout(() => { try { fs.unlinkSync(filePath); } catch {} }, 5000);

    } catch (e) {
      console.error(e);
      api.setMessageReaction("❌", messageID, () => {}, true);
    }
  }
};
