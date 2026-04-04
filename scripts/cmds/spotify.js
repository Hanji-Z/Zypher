const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "music",
    aliases: ["play", "غنيلي", "spo"],
    version: "5.0.0",
    author: "Hanji & Zypher",
    countDown: 10,
    role: 0,
    category: "MUSIC",
    shortDescription: { en: "Download music with multiple sources" }
  },

  onStart: async function ({ api, event, args, message }) {
    const { threadID, messageID } = event;
    const query = args.join(" ");
    const sidebar = "█║ ";
    const cachePath = path.join(__dirname, "cache", `${Date.now()}.mp3`);

    if (!query) return message.reply(sidebar + "⚠️ | كتب سمية الأغنية أ هانجي!");

    try {
      api.setMessageReaction("🔍", messageID, () => {}, true);

      // 1️⃣ البحث بـ RapidAPI (حيت البحث عندك خدام ناضي)
      const searchHeaders = {
        'x-rapidapi-key': 'd7beed5439msh7acb6c7f34a45c7p1126c3jsn210162f8627c',
        'x-rapidapi-host': 'yt-search-and-download-mp3.p.rapidapi.com'
      };

      const searchRes = await axios.get(`https://yt-search-and-download-mp3.p.rapidapi.com/search`, {
        params: { q: query },
        headers: searchHeaders
      });

      if (!searchRes.data.videos || searchRes.data.videos.length === 0) {
        return message.reply(sidebar + "❌ | مالقيت والو!");
      }

      const video = searchRes.data.videos[0];
      const videoUrl = video.url;

      api.setMessageReaction("📥", messageID, () => {}, true);

      // 2️⃣ محاولة التحميل (Source 1: RapidAPI)
      let downloadLink;
      try {
        const res = await axios.get(`https://yt-search-and-download-mp3.p.rapidapi.com/mp3`, {
          params: { url: videoUrl },
          headers: searchHeaders
        });
        downloadLink = res.data.link;
      } catch (e) { console.log("RapidAPI Failed, switching..."); }

      // 3️⃣ الـ Backup (إيلا فشل الأول غايخدم هادا فابور وناضي)
      if (!downloadLink) {
        const backup = await axios.get(`https://api.maher-zubair.tech/download/ytmp3?url=${encodeURIComponent(videoUrl)}`);
        downloadLink = backup.data.result?.url || backup.data.result?.download;
      }

      if (!downloadLink) throw new Error("All sources failed");

      // 4️⃣ التحميل والإرسال
      const response = await axios({ method: 'GET', url: downloadLink, responseType: 'stream' });
      const writer = fs.createWriteStream(cachePath);
      response.data.pipe(writer);

      writer.on('finish', async () => {
        const msg = {
          body: `[ 𝗭𝗬𝗣𝗛𝗘𝗥 - 𝗠𝗨𝗦𝗜𝗖 ]\n█║──────────────────\n${sidebar}❯ 𝗧𝗜𝗧𝗟𝗘: ${video.name}\n${sidebar}❯ 𝗦𝗧𝗔𝗧𝗨𝗦: Success ✅\n█║──────────────────`,
          attachment: fs.createReadStream(cachePath)
        };
        await api.sendMessage(msg, threadID, () => fs.unlinkSync(cachePath), messageID);
        api.setMessageReaction("🎵", messageID, () => {}, true);
      });

    } catch (e) {
      console.error(e);
      if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
      api.setMessageReaction("⚠️", messageID, () => {}, true);
      return message.reply(sidebar + "🚫 | السيرفرات كاملين معكسين دابا، جرب شي أغنية خرى.");
    }
  }
};
