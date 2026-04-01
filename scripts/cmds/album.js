const axios = require('axios');
const path = require('path');
const fs = require('fs-extra');

module.exports = {
  config: {
    name: "album",
    aliases: ["vid", "ميديا"],
    version: "2.0.0",
    author: "Zypher",
    countDown: 5,
    role: 0,
    category: "MEDIA",
    shortDescription: { en: "Watch random videos/photos from categories" },
    guide: { en: "{pn} | {pn} list | {pn} add [type] (reply to media)" }
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID, senderID } = event;
    const sidebar = "█║ ";
    const line = "█║──────────────────";

    // --- CASE 1: Main Menu (No Args) ---
    if (!args[0]) {
      api.setMessageReaction("🎬", messageID, () => {}, true);
      const options = [
        "Funny", "Islamic", "Sad", "Anime", "Cartoon", 
        "LoFi", "Horny", "Couple", "Baby", "Sigma", "Lyrics", "Photo"
      ];

      let menu = `[ 𝗭𝗬𝗣𝗛𝗘𝗥 - 𝗔𝗟𝗕𝗨𝗠 ]\n${line}\n`;
      options.forEach((opt, i) => {
        menu += `${sidebar}${i + 1}. ${opt} Video\n`;
      });
      menu += `${line}\n${sidebar}💡 Reply with a number to watch.`;

      return api.sendMessage(menu, threadID, (err, info) => {
        global.GoatBot.onReply.set(info.messageID, {
          commandName: this.config.name,
          author: senderID,
          options
        });
      }, messageID);
    }

    // --- CASE 2: List Command ---
    if (args[0] === 'list') {
      try {
        const res = await axios.get(`https://zzxfh5-3000.csb.app/data?list=dipto`);
        return api.sendMessage(`[ 𝗔𝗟𝗕𝗨𝗠 𝗦𝗧𝗔𝗧𝗦 ]\n${line}\n${sidebar}Total: ${res.data.data}`, threadID, messageID);
      } catch (e) {
        return api.sendMessage(sidebar + "❌ Server Error.", threadID, messageID);
      }
    }

    // --- CASE 3: Add Media (Admin/Owner only suggested) ---
    if (args[0] === 'add') {
        // منطق الإضافة كيبغي Reply لتصويرة ولا فيديو
        return api.sendMessage(sidebar + "🛠️ Feature under maintenance.", threadID, messageID);
    }
  },

  onReply: async function ({ api, event, Reply }) {
    const { threadID, messageID, body, senderID } = event;
    const sidebar = "█║ ";
    if (senderID !== Reply.author) return;

    const index = parseInt(body) - 1;
    if (isNaN(index) || !Reply.options[index]) {
        return api.sendMessage(sidebar + "⚠️ Invalid choice.", threadID, messageID);
    }

    api.unsendMessage(Reply.messageID);
    api.setMessageReaction("⏳", messageID, () => {}, true);

    const query = Reply.options[index].toLowerCase();
    
    try {
      const res = await axios.get(`https://zzxfh5-3000.csb.app/data?type=${query}`);
      const videoUrl = res.data.data;
      
      const filePath = path.join(__dirname, 'cache', `${Date.now()}.mp4`);
      const vidRes = await axios.get(videoUrl, { responseType: 'arraybuffer' });
      fs.writeFileSync(filePath, Buffer.from(vidRes.data, 'binary'));

      return api.sendMessage({
        body: `[ 𝗭𝗬𝗣𝗛𝗘𝗥 - 𝗦𝗧𝗥𝗘𝗔𝗠 ]\n${sidebar}Playing: ${Reply.options[index]}`,
        attachment: fs.createReadStream(filePath)
      }, threadID, () => fs.unlinkSync(filePath), messageID);

    } catch (e) {
      return api.sendMessage(sidebar + "❌ Failed to fetch media.", threadID, messageID);
    }
  }
};

