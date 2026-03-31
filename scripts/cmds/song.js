const axios = require("axios");
const fs = require("fs-extra");
const ytSearch = require("yt-search");
const path = require("path");

module.exports = {
  config: {
    name: "song",
    version: "3.0.0",
    author: "Zypher & Hanji",
    countDown: 5,
    role: 0,
    category: "media",
    guide: { en: "{pn} [song name]" }
  },

  onStart: async ({ api, args, event }) => {
    const { threadID, messageID } = event;
    const songName = args.join(" ");
    const cachePath = path.join(__dirname, 'cache');
    const zypherBox = (title, msg) => `[ 𝗭𝗬𝗣𝗛𝗘𝗥 - ${title} ]\n╼━━━━━━━━━━━━━━━━━━━━╾\n${msg}\n╼━━━━━━━━━━━━━━━━━━━━╾\n[ 𝗔𝗖𝗖𝗘𝗦𝗦 𝗚𝗥𝗔𝗡𝗧𝗘𝗗 - 𝗛𝗔𝗡𝗝𝗜 ]`;

    if (!songName) return api.setMessageReaction("⚠️", messageID, () => {}, true);

    api.setMessageReaction("⏳", messageID, () => {}, true);

    try {
      // 1. البحث عن الأغنية
      const searchResults = await ytSearch(songName);
      const video = searchResults.videos[0];
      if (!video) return api.setMessageReaction("🤷‍♂️", messageID, () => {}, true);

      // 2. استخدام Pro API للتحويل (بإستعمال محرك yt-dlp الخارجي)
      // غانخدمو بـ API كيعطي رابط مباشر للملف
      const res = await axios.get(`https://api.vkrdown.com/api/get.php?url=${video.url}`);
      
      // ملاحظة: هاد الـ API هو مثال، كاينين بزاف بحال Cobalt ولا Private APIs
      const downloadUrl = res.data.data.find(f => f.format === "mp3" || f.ext === "mp3")?.url 
                        || res.data.data[0].url;

      if (!downloadUrl) throw new Error("Could not fetch download link");

      if (!fs.existsSync(cachePath)) fs.mkdirSync(cachePath);
      const filePath = path.join(cachePath, `${Date.now()}.mp3`);

      // 3. تحميل الملف للسيرفر (Railway) ديريكت
      const response = await axios({
        method: 'get',
        url: downloadUrl,
        responseType: 'stream'
      });

      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);

      writer.on('finish', async () => {
        // 4. الإرسال بـ الهيبة د زيفر
        await api.sendMessage({
          body: zypherBox("𝗣𝗟𝗔𝗬𝗜𝗡𝗚", 
            `  ❯ 🎵 𝗧𝗜𝗧𝗟𝗘 : ${video.title}\n` +
            `  ❯ ⏱️ 𝗧𝗜𝗠𝗘 : ${video.timestamp}\n` +
            `  ❯ 🔗 𝗦𝗢𝗨𝗥𝗖𝗘 : YouTube (Pro API)`),
          attachment: fs.createReadStream(filePath)
        }, threadID, () => {
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
          api.setMessageReaction("✅", messageID, () => {}, true);
        }, messageID);
      });

      writer.on('error', (err) => { throw err; });

    } catch (error) {
      console.error(error);
      api.setMessageReaction("❌", messageID, () => {}, true);
      // إيلا فشل الـ API الأول، كاين ديما Plan B
      api.sendMessage(zypherBox("𝗦𝗬𝗦𝗧𝗘𝗠-𝗘𝗥𝗥𝗢𝗥", "❯ ❌ السيرفر ديال التحميل عليه الضغط، جرب مرة خرى!"), threadID, messageID);
    }
  }
};
