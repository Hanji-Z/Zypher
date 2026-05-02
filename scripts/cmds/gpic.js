const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "gpic",
    aliases: ["groupimg", "تصويرة"],
    version: "1.1.0",
    author: "Hanji",
    countDown: 5,
    role: 0,
    description: { en: "Get current group profile picture" },
    category: "Utility",
    guide: { en: "{pn}" }
  },

  onStart: async function ({ api, event, message }) {
    const { threadID, messageID } = event;

    try {
      const threadInfo = await api.getThreadInfo(threadID);
      const imageUrl = threadInfo.imageSrc;

      if (!imageUrl) {
        return message.reply("❌ هاد لڭروب ما مدايرش تصويرة أ هانجي.");
      }

      const cachePath = path.join(__dirname, "cache", `gpic_${threadID}.png`);

      const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      fs.writeFileSync(cachePath, Buffer.from(response.data, 'utf-8'));

      // ميساج نقي بلا "سيدي"
      const bodyMsg = `[ 𝗭𝗬𝗣𝗛𝗘𝗥 - 𝗜𝗠𝗔𝗚𝗘_𝗙𝗘𝗧𝗖𝗛 ]\n╼━━━━━━━━━━━━╾\n❯ [𝗦𝗢𝗨𝗥𝗖𝗘] : ${threadInfo.threadName || "Group"}\n❯ [𝗦𝗧𝗔𝗧𝗨𝗦] : 𝗗𝗼𝗻𝗲 ✅\n╼━━━━━━━━━━━━╾\nهاهي تصويرة لڭروب ناضية!`;

      return api.sendMessage({
        body: bodyMsg,
        attachment: fs.createReadStream(cachePath)
      }, threadID, () => {
        if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
      }, messageID);

    } catch (error) {
      console.error(error);
      return message.reply("❌ كاين شي مشكل فـ السيرفر مابغاش يجيبها.");
    }
  }
};
