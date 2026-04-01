const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const channelLinks = [ 
  "https://www.youtube.com/@AnimeMVSensei",
];

module.exports = {
  config: {
    name: "amv",
    aliases: ["animevideo"], 
    author: "Zypher",
    version: "1.1.0",
    countDown: 10,
    role: 0,
    shortDescription: { en: "Get a random anime AMV" },
    category: "MEDIA",
    guide: { en: "{pn}" },
  },

  onStart: async function ({ api, event, message }) {
    const { threadID, messageID } = event;
    const sidebar = "█║ ";
    
    api.setMessageReaction("✨", messageID, () => {}, true);

    try {
      // 1. اختيار قناة عشوائية
      const randomChannel = channelLinks[Math.floor(Math.random() * channelLinks.length)];

      // 2. طلب الفيديو من الـ API
      const res = await axios.get(`https://god-kshitiz.vercel.app/channel?link=${encodeURIComponent(randomChannel)}`);
      
      if (!res.data || !res.data.urls || res.data.urls.length === 0) {
        return message.reply(sidebar + "❌ No videos found in this channel.");
      }

      const videoUrl = res.data.urls[Math.floor(Math.random() * res.data.urls.length)];

      // 3. تجهيز المجلد والملف (سمية فريدة)
      const cachePath = path.join(__dirname, "cache");
      if (!fs.existsSync(cachePath)) fs.mkdirSync(cachePath);
      
      const fileName = `amv_${Date.now()}.mp4`;
      const tempPath = path.join(cachePath, fileName);

      // 4. تحميل الفيديو كـ Stream
      const videoStream = await axios.get(videoUrl, { responseType: "stream" });
      const writer = fs.createWriteStream(tempPath);

      videoStream.data.pipe(writer);

      writer.on("finish", async () => {
        // 5. إرسال الفيديو ومسحه
        await message.reply({
          body: `[ 𝗭𝗬𝗣𝗛𝗘𝗥 - 𝗔𝗠𝗩 ]\n${sidebar}Enjoy your edit! 🎬`,
          attachment: fs.createReadStream(tempPath)
        });

        api.setMessageReaction("✅", messageID, () => {}, true);
        
        // مسح الملف باش ما يعمرش السيرفر
        setTimeout(() => {
            if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        }, 5000);
      });

      writer.on("error", (err) => {
        console.error(err);
        message.reply(sidebar + "❌ Error while saving video.");
      });

    } catch (error) {
      console.error(error);
      message.reply(sidebar + "❌ API is down or video is too large.");
    }
  }
};
