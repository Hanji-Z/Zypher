const fs = require("fs-extra");
const path = require("path");
const { exec } = require("child_process");
const yts = require("youtube-search-api");

module.exports = {
  config: {
    name: "play", // <--- تأكد بلي هادي هي لي كتكتب مورا النقطة
    version: "4.5.0",
    role: 0,
    author: "Hanji",
    description: { en: "Download music with error reporting" },
    category: "Music",
    guide: { en: "{pn} [song name]" },
    countDown: 5
  },

  onStart: async function ({ api, event, args, message }) {
    const { threadID, messageID } = event;
    const query = args.join(" ");

    if (!query) return api.setMessageReaction("❓", messageID, () => {}, true);

    const cacheDir = path.join(__dirname, "cache");
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);

    // استعملنا Date.now() بلاصة messageID باش نتفاداو الرموز لي كتهرس الكود
    const fileName = `zypher_${Date.now()}`;
    const cachePath = path.join(cacheDir, `${fileName}.mp3`);
    const cookiePath = path.join(cacheDir, `cookies_${fileName}.txt`);

    api.setMessageReaction("🔍", messageID, () => {}, true);

    try {
      const search = await yts.GetListByKeyword(query, false, 1);
      const video = search.items[0];
      if (!video) return api.setMessageReaction("❌", messageID, () => {}, true);

      const officialTitle = video.title;
      const videoUrl = `https://www.youtube.com/watch?v=${video.id}`;

      if (process.env.YT_COOKIES) {
        fs.writeFileSync(cookiePath, process.env.YT_COOKIES);
      }

      const cookieArg = fs.existsSync(cookiePath) ? `--cookies "${cookiePath}"` : "";
      api.setMessageReaction("⏬", messageID, () => {}, true);

      // أمر التحميل
      const cmd = `yt-dlp ${cookieArg} -x --audio-format mp3 --audio-quality 0 --output "${cachePath.replace('.mp3', '.%(ext)s')}" "${videoUrl}"`;

      exec(cmd, async (error, stdout, stderr) => {
        if (error) {
          console.error(`[ZYPHER ERROR]: ${stderr || error.message}`);
          api.setMessageReaction("❌", messageID, () => {}, true);
          // غايصيفط ليك علاش فشل بـ الضبط (تقدر تمسح هاد السطر من بعد)
          message.reply(`❌ فشل التحميل: ${error.message.split(' ').slice(0, 10).join(' ')}...`);
          if (fs.existsSync(cookiePath)) fs.unlinkSync(cookiePath);
          return;
        }

        if (fs.existsSync(cachePath)) {
          api.setMessageReaction("✅", messageID, () => {}, true);
          api.sendMessage({
            body: `🎵 | ${officialTitle}`,
            attachment: fs.createReadStream(cachePath)
          }, threadID, () => {
            if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
            if (fs.existsSync(cookiePath)) fs.unlinkSync(cookiePath);
          }, messageID);
        } else {
          api.setMessageReaction("⚠️", messageID, () => {}, true);
          if (fs.existsSync(cookiePath)) fs.unlinkSync(cookiePath);
        }
      });

    } catch (err) {
      api.setMessageReaction("❌", messageID, () => {}, true);
      if (fs.existsSync(cookiePath)) fs.unlinkSync(cookiePath);
    }
  }
};
