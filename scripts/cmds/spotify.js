const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "spotify",
    aliases: ["spo", "أغنيةة", "song"],
    version: "2.1.0",
    author: "Hanji & Zypher",
    countDown: 10,
    role: 0,
    category: "MUSIC",
    shortDescription: { en: "Search and download Spotify music" }
  },

  onStart: async function ({ api, event, args, message }) {
    const { threadID, messageID } = event;
    let query = args.join(" ");
    const sidebar = "█║ ";
    const cachePath = path.join(__dirname, "cache", `${Date.now()}.mp3`);

    if (!query) return message.reply(sidebar + "⚠️ | كتب سمية الأغنية ولا حط الرابط أ هانجي!");

    // 🔑 سـوارت RapidAPI ديالك
    const headers = {
      'x-rapidapi-key': 'd7beed5439msh7acb6c7f34a45c7p1126c3jsn210162f8627c',
      'x-rapidapi-host': 'spotify-downloader9.p.rapidapi.com'
    };

    try {
      api.setMessageReaction("🔍", messageID, () => {}, true);

      // 🕵️ المرحلة 1: البحث (إيلا مكانش رابط)
      if (!query.startsWith("https://")) {
        const searchRes = await axios.get(`https://api.maher-zubair.tech/search/spotify?q=${encodeURIComponent(query)}`);
        
        if (!searchRes.data || !searchRes.data.result || searchRes.data.result.length === 0) {
          api.setMessageReaction("❌", messageID, () => {}, true);
          return message.reply(sidebar + "❌ | مالقيت حتى أغنية بهاد السمية!");
        }
        // هز أول رابط طلع فـ البحث
        query = searchRes.data.result[0].url;
      }

      // 📥 المرحلة 2: جلب رابط التحميل بـ RapidAPI
      api.setMessageReaction("🔄", messageID, () => {}, true);
      const res = await axios.get(`https://spotify-downloader9.p.rapidapi.com/downloadSong`, {
        params: { songId: query },
        headers: headers
      });

      if (!res.data || res.data.success !== true) {
         api.setMessageReaction("⚠️", messageID, () => {}, true);
         return message.reply(sidebar + "❌ | السيرفر رفض الطلب. تأكد من Quota ديال RapidAPI.");
      }

      const { downloadLink, title, artist } = res.data.data;

      // 💾 المرحلة 3: التحميل الفعلي (Binary Mode)
      api.setMessageReaction("📥", messageID, () => {}, true);
      const audioRes = await axios.get(downloadLink, { responseType: "arraybuffer" });
      fs.writeFileSync(cachePath, Buffer.from(audioRes.data));

      // 🚀 المرحلة 4: الإرسال
      const msg = {
        body: `[ 𝗭𝗬𝗣𝗛𝗘𝗥 - 𝗦𝗣𝗢𝗧𝗜𝗙𝗬 ]\n█║──────────────────\n${sidebar}❯ 𝗧𝗜𝗧𝗟𝗘: ${title}\n${sidebar}❯ 𝗔𝗥𝗧𝗜𝗦𝗧: ${artist}\n${sidebar}❯ 𝗦𝗧𝗔𝗧𝗨𝗦: Success ✅\n█║──────────────────`,
        attachment: fs.createReadStream(cachePath)
      };

      await api.sendMessage(msg, threadID, (err) => {
        if (err) console.error(err);
        if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
      }, messageID);

      api.setMessageReaction("🎵", messageID, () => {}, true);

    } catch (e) {
      console.error(e);
      if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
      api.setMessageReaction("❌", messageID, () => {}, true);
      return message.reply(sidebar + "🚫 | وقع مشكل تقني. جرب رابط ديريكت إيلا مانفعش البحث.");
    }
  }
};
