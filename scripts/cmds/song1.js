const fs = require("fs-extra");
const path = require("path");
const { exec } = require("child_process");
const yts = require("youtube-search-api");

module.exports = {
  config: {
    name: "sing",
    version: "4.1.0",
    role: 0,
    author: "Hanji",
    description: { en: "Download music with official YouTube titles" },
    category: "Music",
    guide: { en: "{pn} [song name]" },
    countDown: 5
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID } = event;
    const query = args.join(" ");

    if (!query) return api.setMessageReaction("❓", messageID, () => {}, true);

    const cacheDir = path.join(__dirname, "cache");
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);

    const cachePath = path.join(cacheDir, `sing_${messageID}.mp3`);
    const cookiePath = path.join(cacheDir, `cookies_${messageID}.txt`);

    api.setMessageReaction("🔍", messageID, () => {}, true);

    try {
      // 1. كنجيبو الداتا من يوتيوب نيشّان
      const search = await yts.GetListByKeyword(query, false, 1);
      const video = search.items[0];
      if (!video) return api.setMessageReaction("❌", messageID, () => {}, true);

      // هادي هي السمية لي مديورة فـ يوتيوب (Official Title)
      const officialTitle = video.title; 
      const videoUrl = `https://www.youtube.com/watch?v=${video.id}`;

      if (process.env.YT_COOKIES) {
        fs.writeFileSync(cookiePath, process.env.YT_COOKIES);
      }

      const cookieArg = fs.existsSync(cookiePath) ? `--cookies "${cookiePath}"` : "";
      api.setMessageReaction("⏬", messageID, () => {}, true);

      const cmd = `yt-dlp ${cookieArg} -x --audio-format mp3 --audio-quality 0 --output "${cachePath.replace('.mp3', '.%(ext)s')}" "${videoUrl}"`;

      exec(cmd, async (error) => {
        if (error) {
          api.setMessageReaction("❌", messageID, () => {}, true);
          if (fs.existsSync(cookiePath)) fs.unlinkSync(cookiePath);
          return;
        }

        if (fs.existsSync(cachePath)) {
          api.setMessageReaction("✅", messageID, () => {}, true);

          api.sendMessage({
            // هنا كنحطو السمية ديال يوتيوب ماشي الـ Query ديال المستخدم
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
