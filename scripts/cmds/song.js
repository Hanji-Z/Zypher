const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

module.exports = {
  config: {
    name: "song",
    aliases: ["music", "اغنية"],
    version: "6.0.0",
    author: "Zypher",
    countDown: 20, // حماية من البلوك والسبام
    role: 0,
    category: "MEDIA",
    shortDescription: { en: "Download full audio with smart duration filter" },
    guide: { en: "{pn} [song name]" }
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID } = event;
    const sidebar = "█║ ";
    const line = "█║──────────────────";
    const query = args.join(" ");

    if (!query) return;

    // تفاعل بالانتظار
    api.setMessageReaction("⏳", messageID, () => {}, true);

    try {
      // البحث في تيكتوك مع إضافة "full song" لضمان نتائج طويلة
      const searchRes = await axios.get(`https://lyric-search-neon.vercel.app/kshitiz?keyword=${encodeURIComponent(query + " full song")}`, { timeout: 15000 });
      const videos = searchRes.data;

      if (!videos || videos.length === 0) {
        api.setMessageReaction("❌", messageID, () => {}, true);
        return;
      }

      // --- 🧠 الفلتر الذكي: البحث عن فيديو بين دقيقة و 4 دقائق ---
      let selectedVideo = videos.find(v => v.duration && v.duration >= 60 && v.duration <= 240);

      // إيلا مالقيناش، ناخدو أطول واحد فيهم
      if (!selectedVideo) {
        selectedVideo = videos.sort((a, b) => (b.duration || 0) - (a.duration || 0))[0];
      }

      const videoUrl = selectedVideo.videoUrl;
      const durationSec = selectedVideo.duration || 0;
      const minutes = Math.floor(durationSec / 60);
      const seconds = durationSec % 60;

      // تجهيز مكان التخزين المؤقت
      const cachePath = path.join(__dirname, 'cache');
      if (!fs.existsSync(cachePath)) fs.mkdirSync(cachePath);
      
      const filePath = path.join(cachePath, `song_${Date.now()}.mp3`);

      // تحميل الملف الصوتي
      const response = await axios({
        method: 'get',
        url: videoUrl,
        responseType: 'stream',
        timeout: 30000 
      });

      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);

      writer.on('finish', async () => {
        // إرسال الأغنية
        await api.sendMessage({
          body: `[ 𝗭𝗬𝗣𝗛𝗘𝗥 - 𝗔𝗨𝗗𝗜𝗢 ]\n${line}\n${sidebar}❯ 🎵 **Track**: ${query}\n${sidebar}❯ ⏳ **Duration**: ${minutes}:${seconds < 10 ? '0' : ''}${seconds}\n${line}\n${sidebar}[ 𝗦𝗬𝗦𝗧𝗘𝗠 𝗢𝗣𝗘𝗥𝗔𝗧𝗜𝗢𝗡𝗔𝗟 ]`,
          attachment: fs.createReadStream(filePath)
        }, threadID, messageID);

        // تبديل الإيموجي لتم بنجاح
        api.setMessageReaction("✅", messageID, () => {}, true);
        
        // مسح الملف مورا 5 ثواني باش السيرفر يبقى نقي
        if (fs.existsSync(filePath)) {
          setTimeout(() => fs.unlinkSync(filePath), 5000);
        }
      });

      writer.on('error', (err) => { throw err; });

    } catch (e) {
      console.error(e);
      api.setMessageReaction("❌", messageID, () => {}, true);
    }
  }
};
