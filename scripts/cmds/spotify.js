const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "music",
    aliases: ["play", "غنيلي", "spo"],
    version: "4.5.0",
    author: "Hanji & Zypher",
    countDown: 10,
    role: 0,
    category: "MUSIC",
    shortDescription: { en: "Search and download music from YouTube" }
  },

  onStart: async function ({ api, event, args, message }) {
    const { threadID, messageID } = event;
    const query = args.join(" ");
    const sidebar = "█║ ";
    const cachePath = path.join(__dirname, "cache", `${Date.now()}.mp3`);

    if (!query) return message.reply(sidebar + "⚠️ | كتب سمية الأغنية أ !");

    const headers = {
      'x-rapidapi-key': 'd7beed5439msh7acb6c7f34a45c7p1126c3jsn210162f8627c',
      'x-rapidapi-host': 'yt-search-and-download-mp3.p.rapidapi.com'
    };

    try {
      api.setMessageReaction("🔍", messageID, () => {}, true);

      // 🕵️ المرحلة 1: الـبـحـث (نستخدم q كـيـمـا قلتي أ معلم)
      const searchRes = await axios.get(`https://yt-search-and-download-mp3.p.rapidapi.com/search`, {
        params: { q: query },
        headers: headers
      });

      // ✅ تـصـحـيـح الـمـسـار: السكرين كاتبين "videos"
      if (!searchRes.data || !searchRes.data.videos || searchRes.data.videos.length === 0) {
        api.setMessageReaction("❌", messageID, () => {}, true);
        return message.reply(sidebar + "❌ | مالقيت حتى نتيجة بهاد السمية!");
      }

      const video = searchRes.data.videos[0];
      const videoUrl = video.url;
      const title = video.name;

      // 🔄 المرحلة 2: جـلـب رابـط الـ MP3
      api.setMessageReaction("📥", messageID, () => {}, true);
      const downloadRes = await axios.get(`https://yt-search-and-download-mp3.p.rapidapi.com/mp3`, {
        params: { url: videoUrl },
        headers: headers
      });

      if (!downloadRes.data || !downloadRes.data.link) {
         api.setMessageReaction("⚠️", messageID, () => {}, true);
         return message.reply(sidebar + "🚫 | السيرفر مابغاش يعطيني رابط التحميل.");
      }

      const downloadLink = downloadRes.data.link;

      // 💾 المرحلة 3: الـتـحـمـيـل (Stream)
      const response = await axios({
        method: 'GET',
        url: downloadLink,
        responseType: 'stream'
      });

      const writer = fs.createWriteStream(cachePath);
      response.data.pipe(writer);

      writer.on('finish', async () => {
        const msg = {
          body: `[ 𝗭𝗬𝗣𝗛𝗘𝗥 - 𝗠𝗨𝗦𝗜𝗖 ]\n█║──────────────────\n${sidebar}❯ 𝗧𝗜𝗧𝗟𝗘: ${title}\n${sidebar}❯ 𝗗𝗨𝗥𝗔𝗧𝗜𝗢𝗡: ${video.duration}\n${sidebar}❯ 𝗦𝗧𝗔𝗧𝗨𝗦: Done ✅\n█║──────────────────`,
          attachment: fs.createReadStream(cachePath)
        };

        await api.sendMessage(msg, threadID, (err) => {
          if (err) console.error(err);
          if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
        }, messageID);

        api.setMessageReaction("🎵", messageID, () => {}, true);
      });

    } catch (e) {
      console.error(e);
      if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
      api.setMessageReaction("❌", messageID, () => {}, true);
      return message.reply(sidebar + "🚫 | وقع مشكل فـ الـ API، تأكد من الـ Quota!");
    }
  }
};
