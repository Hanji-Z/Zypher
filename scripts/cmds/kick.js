const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "kick",
    aliases: ["روح", "برا", "الواسعة", "الخايب"], 
    version: "4.0.0",
    author: "Hanji",
    countDown: 1, 
    role: 1, 
    category: "box chat",
    guide: { en: "{pn} @tags | {pn} (as a reply)" }
  },

  onStart: async function ({ api, event, args, message, usersData }) {
    const { threadID, senderID, messageReply, mentions } = event;
    const adminBot = global.GoatBot.config.adminBot || [];
    const sidebar = "█║ ";
    const line = "█║──────────────────";
    const imagePath = path.join(process.cwd(), "scripts", "cmds", "cache", "kick.jpg");

    // فحص رتبة البوت (ضروري باش ما يوقعش Error)
    const threadInfo = await api.getThreadInfo(threadID);
    if (!threadInfo.adminIDs.some(admin => admin.id == api.getCurrentUserID())) {
      return api.sendMessage(sidebar + "⚠️ | I need Admin power to purge users!", threadID);
    }

    let targets = [];
    if (messageReply) targets.push(messageReply.senderID);
    if (Object.keys(mentions).length > 0) targets = targets.concat(Object.keys(mentions));

    if (targets.length === 0) return api.sendMessage("⚠️ Mention someone or reply to their message!", threadID);

    targets = [...new Set(targets)];

    for (const targetID of targets) {
      if (adminBot.includes(targetID.toString())) {
        return api.sendMessage(`${sidebar}🔒 [ 𝗦𝗬𝗦𝗧𝗘𝗠 𝗗𝗘𝗙𝗘𝗡𝗦𝗘 ]\n${line}\n${sidebar}Error: Targeting developer Hanji is restricted. 👑`, threadID);
      }
      if (targetID == api.getCurrentUserID()) continue;

      try {
        const name = await usersData.getName(targetID);
        const bodyMsg = `[ 𝗭𝗬𝗣𝗛𝗘𝗥 - 𝗞𝗜𝗖𝗞 𝗗𝗘𝗣𝗟𝗢𝗬𝗘𝗗 ]\n${line}\n${sidebar}❯ 𝗧𝗔𝗥𝗚𝗘𝗧: ${name}\n${sidebar}❯ 𝗦𝗧𝗔𝗧𝗨𝗦: Terminated 🚮\n${line}`;

        const msg = { body: bodyMsg };
        if (fs.existsSync(imagePath)) {
            msg.attachment = fs.createReadStream(imagePath);
        }

        // 🚀 هادي هي "اللعيبة": كنصيفطو الطلبات بجوج لفيسبوك فـ دقة وحدة
        // السيرفر ديال فيسبوك كيعالجهم فـ نفس اللحظة تقريباً
        Promise.all([
            api.sendMessage(msg, threadID),
            api.removeUserFromGroup(targetID, threadID)
        ]).catch(err => {
            // إيلا فشل الميساج بسبب الحظر، كيحاول يطرد بوحدو
            api.removeUserFromGroup(targetID, threadID);
        });

      } catch (e) {
        console.error("Error in instant kick:", e);
      }
    }
  }
};
