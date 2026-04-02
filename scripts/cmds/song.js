const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

module.exports = {
  config: {
    name: "song",
    aliases: ["music", "اغنية"],
    version: "5.0.0",
    author: "Zypher",
    countDown: 10,
    role: 0,
    category: "MEDIA",
    shortDescription: { en: "Smart TikTok Audio with Duration Filter" },
    guide: { en: "{pn} [song name]" }
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID } = event;
    const sidebar = "█║ ";
    const line = "█║──────────────────";
    const query = args.join(" ");

    if (!query) return;

    api.setMessageReaction("⏳", messageID, () => {}, true);

    try {
      // زدت "full song" فـ البحث باش تيكتوك يعطينا نتائج طويلة
      const searchRes = await axios.get(`https://lyric-search-neon.vercel.app/kshitiz?keyword=${encodeURIComponent(query + " full song")}`);
      const videos = searchRes.data;

      if (!videos || videos.length === 0) {
        api.setMessageReaction("❌", messageID, () => {}, true);
        return;
      }

      // --- 🧠 منطق الفلتر الذكي ---
      // غانقلبو فـ أول 10 نتائج على فيديو الطول ديالو بين دقيقة و 4 دقائق
      let selectedVideo = videos.find(v => v.duration && v.duration >= 60 && v.duration <= 300);

      // إيلا مالقيناش شي واحد فهاد المجال، غانخدو أطول واحد فـ اللستة
      if (!selectedVideo) {
        selectedVideo = videos.sort((a, b) => (b.duration || 0) - (a.duration || 0))[0];
      }

      const videoUrl = selectedVideo.videoUrl;
      const durationSec = selectedVideo.duration || 0;
      const minutes = Math.floor(durationSec / 60);
      const seconds = durationSec % 60;

      const filePath = path.join(__dirname, 'cache', `song_${Date.now()}.mp3`);

      const response = await axios({
        method: 'get',
        url: videoUrl,
        responseType: 'stream',
        timeout: 30000 
      });

      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);

      writer.on('finish', async () => {
        await api.sendMessage({
          body: `[ 𝗭𝗬𝗣𝗛𝗘𝗥 - 𝗦𝗠𝗔𝗥𝗧 𝗔𝗨𝗗𝗜𝗢 ]\n${line}\n${sidebar}❯ 🎵 **Track**: ${query}\n${sidebar}❯ ⏳ **Duration**: ${minutes}:${seconds < 10 ? '0' : ''}${seconds}\n${sidebar}❯ 🚀 **Engine**: TikTok Filtered\n${line}\n${sidebar}[ 𝗦𝗬𝗦𝗧𝗘𝗠 𝗢𝗣𝗘𝗥𝗔𝗧𝗜𝗢𝗡𝗔𝗟 ]`,
          attachment: fs.createReadStream(filePath)
        }, threadID, messageID);

        api.setMessageReaction("✅", messageID, () => {}, true);
        
        if (fs.existsSync(filePath)) {
          setTimeout(() => fs.unlinkSync(filePath), 5000);
        }
      });

    } catch (e) {
      console.error(e);
      api.setMessageReaction("❌", messageID, () => {}, true);
    }
  }
};
