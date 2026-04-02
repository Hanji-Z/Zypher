const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

module.exports = {
  config: {
    name: "song",
    aliases: ["اغنية", "music"],
    version: "3.1.0",
    author: "Zypher",
    countDown: 15,
    role: 0,
    category: "MEDIA",
    shortDescription: { en: "Download FULL songs via YouTube Engine (Silent Mode)" },
    guide: { en: "{pn} [song name]" }
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID } = event;
    const sidebar = "█║ ";
    const line = "█║──────────────────";
    const query = args.join(" ");

    if (!query) return; // سكت كاع إيلا ما صيفط والو

    // التفاعل بإيموجي الانتظار (عوض الميساج)
    api.setMessageReaction("⏳", messageID, () => {}, true);

    try {
      // 1. البحث في يوتيوب
      const searchUrl = `https://api.vkrhost.in/youtube/search?q=${encodeURIComponent(query)}`;
      const searchRes = await axios.get(searchUrl);
      
      if (!searchRes.data || !searchRes.data.results || searchRes.data.results.length === 0) {
        api.setMessageReaction("❌", messageID, () => {}, true);
        return;
      }

      const videoId = searchRes.data.results[0].id;
      const downloadUrl = `https://api.vkrhost.in/youtube/download?id=${videoId}&type=mp3`;
      const finalRes = await axios.get(downloadUrl);

      const audioUrl = finalRes.data.download_url;
      const filePath = path.join(__dirname, 'cache', `song_${Date.now()}.mp3`);

      // 2. تحميل الأوديو
      const response = await axios({
        method: 'get',
        url: audioUrl,
        responseType: 'stream',
        timeout: 45000 // كنزيدو الوقت شوية للأغاني الطويلة
      });

      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);

      writer.on('finish', async () => {
        // 3. إرسال الأوديو وتغيير التفاعل
        await api.sendMessage({
          body: `[ 𝗭𝗬𝗣𝗛𝗘𝗥 - 𝗔𝗨𝗗𝗜𝗢 ]\n${line}\n${sidebar}🎵 **Track**: ${query}\n${sidebar}🎧 **Mode**: Full Quality\n${line}\n${sidebar}[ 𝗦𝗬𝗦𝗧𝗘𝗠 𝗢𝗣𝗘𝗥𝗔𝗧𝗜𝗢𝗡𝗔𝗟 ]`,
          attachment: fs.createReadStream(filePath)
        }, threadID, messageID);

        api.setMessageReaction("✅", messageID, () => {}, true);
        
        if (fs.existsSync(filePath)) {
          setTimeout(() => fs.unlinkSync(filePath), 5000); // مسح الملف مورا 5 ثواني
        }
      });

      writer.on('error', (err) => { throw err; });

    } catch (e) {
      console.error(e);
      api.setMessageReaction("❌", messageID, () => {}, true);
    }
  }
};
