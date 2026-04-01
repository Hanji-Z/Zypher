const DIG = require("discord-image-generation");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "affect",
    aliases: ["aff"],
    version: "1.2.0",
    author: "Zypher",
    countDown: 5,
    role: 0,
    shortDescription: { en: "Affect meme with avatar" },
    category: "IMAGE", // رديناها IMAGE نقية
    guide: { en: "{pn} | {pn} @mention | Reply to a message" }
  },

  onStart: async function ({ event, message, usersData }) {
    const { threadID, messageID, senderID, messageReply, mentions } = event;
    const sidebar = "█║ ";
    const line = "█║──────────────────";

    api.setMessageReaction("🖼️", messageID, () => {}, true);

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
      let img = await new DIG.Affect().getImage(avatarUrl);

      // تأكد بلي فولدر tmp كاين باش ما يوقعش crash
      const tmpPath = path.join(__dirname, "tmp");
      if (!fs.existsSync(tmpPath)) fs.mkdirSync(tmpPath);
      
      const pathSave = path.join(tmpPath, `affect_${uid}.png`);
      fs.writeFileSync(pathSave, Buffer.from(img));

      // الميساج اللي غايخرج (مختصر بلونغلي)
      const body = "🖼️ The affect is visible.";

      return message.reply({
        body: `[ 𝗭𝗬𝗣𝗛𝗘𝗥 - 𝗜𝗠𝗔𝗚𝗘 ]\n${sidebar}${body}`,
        attachment: fs.createReadStream(pathSave)
      }, () => {
        if (fs.existsSync(pathSave)) fs.unlinkSync(pathSave);
      });

    } catch (e) {
      console.error(e);
      return message.reply(sidebar + "❌ Error: Could not generate affect meme.");
    }
  }
};
