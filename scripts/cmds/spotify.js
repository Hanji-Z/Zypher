const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "spotify",
    aliases: ["spo", "song"],
    version: "1.0.0",
    author: "Hanji & Zypher",
    countDown: 10,
    role: 0,
    category: "MUSIC",
    shortDescription: { en: "Download music from Spotify" }
  },

  onStart: async function ({ api, event, args, message }) {
    const { threadID, messageID } = event;
    const query = args.join(" ");
    const sidebar = "█║ ";

    if (!query) return message.reply(sidebar + "⚠️ | كتب سمية الأغنية أ عشيري!");

    const cachePath = path.join(__dirname, "cache", `${Date.now()}.mp3`);
    api.setMessageReaction("🔍", messageID, () => {}, true);

    // 🔑 السوارت لي جبتي من RapidAPI
    const headers = {
      'x-rapidapi-key': 'd7beed5439msh7acb6c7f34a45c7p1126c3jsn210162f8627c',
      'x-rapidapi-host': 'spotify-downloader9.p.rapidapi.com'
    };

    try {
      // 1️⃣ الـبـحـث عـن الأغـنـيـة (Search)
      // ملاحظة: هاد الـ API كيحتاج ID أو Link، غانحاولو نجيبوه بـ Search أولاً
      const searchRes = await axios.get(`https://spotify-downloader9.p.rapidapi.com/downloadSong`, {
        params: { songId: query }, // هاد الـ API غالباً كيبغي Link ديريكت
        headers: headers
      });

      if (!searchRes.data.success) {
        return message.reply(sidebar + "❌ | مالقيتش هاد الأغنية، جرب تحط الـ Link ديالها من سبوتيفاي أحسن.");
      }

      const { downloadLink, title, artist } = searchRes.data.data;

      // 2️⃣ تـحـمـيـل الأغـنـيـة (Download)
      api.setMessageReaction("📥", messageID, () => {}, true);
      const audioStream = await axios.get(downloadLink, { responseType: "arraybuffer" });
      fs.writeFileSync(cachePath, Buffer.from(audioStream.data, "utf-8"));

      // 3️⃣ إرسـال الأوديـو
      const msg = {
        body: `[ 𝗭𝗬𝗣𝗛𝗘𝗥 - 𝗦𝗣𝗢𝗧𝗜𝗙𝗬 ]\n█║──────────────────\n${sidebar}❯ 𝗧𝗜𝗧𝗟𝗘: ${title}\n${sidebar}❯ 𝗔𝗥𝗧𝗜𝗦𝗧: ${artist}\n${sidebar}❯ 𝗦𝗧𝗔𝗧𝗨𝗦: Done ✅\n█║──────────────────`,
        attachment: fs.createReadStream(cachePath)
      };

      await api.sendMessage(msg, threadID, (err) => {
        if (err) console.error(err);
        if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath); // مسح الكاش
      }, messageID);

      api.setMessageReaction("🎵", messageID, () => {}, true);

    } catch (e) {
      console.error(e);
      if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
      return message.reply(sidebar + "🚫 Error: وقع مشكل فـ السيرفر ولا الساروت تسالا!");
    }
  }
};

