const DIG = require("discord-image-generation");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "ads",
    version: "1.1.0",
    author: "Zypher",
    countDown: 5,
    role: 0,
    shortDescription: { en: "Create an advertisement meme" },
    category: "FUN", // رديناها FUN باش يتجمع المنيو
    guide: { en: "{pn} | {pn} @mention | Reply to a message" }
  },

  onStart: async function ({ event, message, usersData }) {
    const { threadID, messageID, senderID, messageReply, mentions } = event;
    const sidebar = "█║ ";
    
    // تحديد الـ UID: يا إما Reply، يا إما Mention، يا إما الشخص براسو
    let uid;
    if (messageReply) {
      uid = messageReply.senderID;
    } else if (Object.keys(mentions).length > 0) {
      uid = Object.keys(mentions)[0];
    } else {
      uid = senderID;
    }

    try {
      let avatarUrl = await usersData.getAvatarUrl(uid);
      
      // صنع الصورة باستعمال مكتبة DIG
      let adImage = await new DIG.Ad().getImage(avatarUrl);

      // تأكد بلي فولدر tmp كاين باش ما يوقعش crash
      const tmpPath = path.join(__dirname, "tmp");
      if (!fs.existsSync(tmpPath)) fs.mkdirSync(tmpPath);
      
      const pathSave = path.join(tmpPath, `ads_${uid}.png`);
      fs.writeFileSync(pathSave, Buffer.from(adImage));

      const body = "✨ Latest Brand In The Market! 🥳";

      return message.reply({
        body: `[ 𝗭𝗬𝗣𝗛𝗘𝗥 - 𝗔𝗗𝗦 ]\n${sidebar}${body}`,
        attachment: fs.createReadStream(pathSave)
      }, () => {
        if (fs.existsSync(pathSave)) fs.unlinkSync(pathSave);
      });

    } catch (e) {
      console.error(e);
      return message.reply(sidebar + "❌ Error: Could not generate advertisement.");
    }
  }
};
