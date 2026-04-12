const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "kick",
    version: "2.5",
    author: "Hanji",
    countDown: 5,
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

    // 1. فحص واش لبوت أدمن
    const threadInfo = await api.getThreadInfo(threadID);
    if (!threadInfo.adminIDs.some(admin => admin.id == api.getCurrentUserID())) {
      return api.sendMessage(sidebar + "⚠️ | البوت محتاج يكون أدمن باش يطرد بنادم!", threadID);
    }

    let targets = [];
    if (messageReply) targets.push(messageReply.senderID);
    if (Object.keys(mentions).length > 0) targets = targets.concat(Object.keys(mentions));

    if (targets.length === 0) return api.sendMessage("⚠️ من فضلك منشن الشخص أو رد على رسالته!", threadID);

    targets = [...new Set(targets)];

    for (const targetID of targets) {
      // حماية المطورين
      if (adminBot.includes(targetID.toString())) {
        return api.sendMessage(`${sidebar}🔒 [ 𝗦𝗬𝗦𝗧𝗘𝗠 𝗗𝗘𝗙𝗘𝗡𝗦𝗘 ]\n${line}\n${sidebar}Error 404: Your power level is too low to target Hanji. ⚠️👑\n${line}\n${sidebar}[ 𝗔𝗖𝗖𝗘𝗦𝗦 𝗗𝗘𝗡𝗜𝗘𝗗 ]`, threadID);
      }

      if (targetID == api.getCurrentUserID()) continue;

      try {
        const name = await usersData.getName(targetID);
        const bodyMsg = `[ 𝗭𝗬𝗣𝗛𝗘𝗥 - 𝗞𝗜𝗖𝗞 𝗗𝗘𝗣𝗟𝗢𝗬𝗘𝗗 ]\n${line}\n${sidebar}❯ 𝗧𝗔𝗥𝗚𝗘𝗧: ${name}\n${sidebar}❯ 𝗦𝗧𝗔𝗧𝗨𝗦: Terminated 🚮\n${line}`;

        // 🖼️ محاولة إرسال الميساج (بالمرفقات)
        // استعملنا .catch باش إيلا كاين Block يكمل الكود
        const msg = { body: bodyMsg };
        if (fs.existsSync(imagePath)) {
            msg.attachment = fs.createReadStream(imagePath);
        }

        await api.sendMessage(msg, threadID).catch(async () => {
            // إيلا فشل حيت كاين بلوك فالتصاور، كيحاول يصيفط غير النص بوحدو
            await api.sendMessage(bodyMsg, threadID).catch(() => console.log("All messages blocked."));
        });

        // 🚪 التنفيذ (الطرد) - هاد السطر غايخدم وخا يفشل الميساج
        await api.removeUserFromGroup(targetID, threadID).catch(err => {
            api.sendMessage("⚠️ فشل الطرد! تأكد من رتبة البوت.", threadID);
        });

      } catch (e) {
        console.error("Error in kick command:", e);
      }
    }
  }
};
