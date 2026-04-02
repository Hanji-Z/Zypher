const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

module.exports = {
  config: {
    name: "song",
    aliases: ["music", "اغنية"],
    version: "1.0.0",
    author: "Zypher",
    countDown: 10,
    role: 0,
    category: "MEDIA",
    shortDescription: { en: "Download songs as Audio/Vocal" },
    guide: { en: "{pn} [song name]" }
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID } = event;
    const sidebar = "█║ ";
    const query = args.join(" ");

    if (!query) return api.sendMessage(sidebar + "❗ عطينا سمية الأغنية باغي نغني ليك أنا؟", threadID, messageID);

    api.setMessageReaction("🎵", messageID, () => {}, true);
    api.sendMessage(sidebar + `🔍 جاري البحث على: "${query}"...`, threadID, messageID);

    try {
      // استعمال API كيجبد الصوت من يوتيوب/تيكتوك (هاد الـ API كيعطي رابط مباشر للصوت)
      const res = await axios.get(`https://api.popcat.xyz/lyrics?song=${encodeURIComponent(query)}`);
      // ملاحظة: هاد الـ API تجريبي، إيلا عندك API خاص بـ mp3 حطو هنا
      const searchRes = await axios.get(`https://lyric-search-neon.vercel.app/kshitiz?keyword=${encodeURIComponent(query + " audio")}`);
      
      const videoUrl = searchRes.data[0].videoUrl; // كياخد أول نتيجة

      // تحويل الفيديو لصوت عبر محرك خارجي (أو إرساله كملف mp4 فيه غير الصوت)
      const filePath = path.join(__dirname, 'cache', `${Date.now()}.mp3`);
      
      // هنا كنخدمو بـ API كيحول الرابط لـ MP3 (مثال)
      const downloadRes = await axios.get(videoUrl, { responseType: 'arraybuffer' });
      fs.writeFileSync(filePath, Buffer.from(downloadRes.data, 'binary'));

      return api.sendMessage({
        body: `[ 𝗭𝗬𝗣𝗛𝗘𝗥 - 𝗔𝗨𝗗𝗜𝗢 ]\n${sidebar}🎧 الأغنية واجدة أ هانجي!\n${sidebar}🎵 الطلب: ${query}`,
        attachment: fs.createReadStream(filePath)
      }, threadID, () => {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }, messageID);

    } catch (e) {
      console.error(e);
      return api.sendMessage(sidebar + "❌ وقع مشكل فـ السيرفر، جرب تقلب بسمية أوضح.", threadID, messageID);
    }
  }
};
