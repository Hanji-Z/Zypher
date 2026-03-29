const fs = require("fs-extra");
const ytdl = require("@distube/ytdl-core");
const ytSearch = require("yt-search");
const path = require("path");

module.exports = {
  config: {
    name: "song",
    version: "2.3.0",
    author: "Zypher & Hanji",
    countDown: 5,
    role: 0,
    shortDescription: { en: "Download music from YouTube" },
    longDescription: { en: "Download high quality audio from YouTube silently" },
    category: "media",
    guide: { en: "{pn} [song name]" }
  },

  onStart: async ({ api, args, event }) => {
    const { threadID, messageID } = event;
    const songName = args.join(" ");
    const cachePath = path.join(__dirname, 'cache');

    // ستايل الزخرفة ديال زيفر فـ النتيجة
    const zypherBox = (title, msg) => `[ 𝗭𝗬𝗣𝗛𝗘𝗥 - ${title} ]\n╼━━━━━━━━━━━━━━━━━━━━╾\n${msg}\n╼━━━━━━━━━━━━━━━━━━━━╾\n[ 𝗔𝗖𝗖𝗘𝗦𝗦 𝗚𝗥𝗔𝗡𝗧𝗘𝗗 - 𝗛𝗔𝗡𝗝𝗜 ]`;

    if (!songName) {
      return api.setMessageReaction("⚠️", messageID, (err) => {}, true);
    }

    // صامت: إيموجي الانتظار
    api.setMessageReaction("⏳", messageID, (err) => {}, true);

    try {
      const searchResults = await ytSearch(songName);
      const video = searchResults.videos[0];

      if (!video) {
        return api.setMessageReaction("🤷‍♂️", messageID, (err) => {}, true);
      }

      if (!fs.existsSync(cachePath)) fs.mkdirSync(cachePath);
      const filePath = path.join(cachePath, `${video.videoId}.mp3`);

      // التحميل باستعمال @distube/ytdl-core اللي عندك فـ الباكج
      const downloadStream = ytdl(video.url, { 
        filter: 'audioonly', 
        quality: 'highestaudio',
        highWaterMark: 1 << 25 
      });
      const fileStream = fs.createWriteStream(filePath);

      downloadStream.pipe(fileStream);

      fileStream.on('finish', async () => {
        await api.sendMessage({
          body: zypherBox("𝗣𝗟𝗔𝗬𝗜𝗡𝗚", 
            `  ❯ 🎵 𝗧𝗜𝗧𝗟𝗘 : ${video.title}\n` +
            `  ❯ ⏱️ 𝗧𝗜𝗠𝗘 : ${video.timestamp}\n` +
            `  ❯ 👤 𝗔𝗥𝗧𝗜𝗦𝗧 : ${video.author.name}`),
          attachment: fs.createReadStream(filePath)
        }, threadID, () => {
          fs.unlinkSync(filePath); // تنظيف الكاش
          api.setMessageReaction("✅", messageID, (err) => {}, true);
        }, messageID);
      });

      downloadStream.on('error', (err) => {
        console.error(err);
        api.setMessageReaction("❌", messageID, (err) => {}, true);
      });

    } catch (error) {
      console.error(error);
      api.setMessageReaction("🆘", messageID, (err) => {}, true);
    }
  }
};
