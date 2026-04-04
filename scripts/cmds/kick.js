const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "kick",
    version: "2.1",
    author: "NTKhang & Hanji",
    countDown: 5,
    role: 1, // مسموح لآدمين لڭروب
    category: "box chat",
    guide: {
      en: "{pn} @tags | {pn} (as a reply)"
    }
  },

  onStart: async function ({ api, event, args, threadsData, message, usersData }) {
    const { threadID, messageID, senderID, messageReply, mentions } = event;
    const adminBot = global.GoatBot.config.adminBot || [];
    const sidebar = "█║ ";
    const line = "█║──────────────────";
    // مسار التصويرة فـ الكاش
    const imagePath = path.join(process.cwd(), "scripts", "cmds", "cache", "kick.jpg");

    // 1. فحص صلاحية البوت فـ لڭروب
    const threadInfo = await api.getThreadInfo(threadID);
    if (!threadInfo.adminIDs.some(admin => admin.id == api.getCurrentUserID())) {
      return message.reply(sidebar + "⚠️ | البوت محتاج يكون أدمن باش يطرد بنادم!");
    }

    let targets = [];
    if (messageReply) targets.push(messageReply.senderID);
    if (Object.keys(mentions).length > 0) targets = targets.concat(Object.keys(mentions));

    if (targets.length === 0) return message.SyntaxError();

    // إزالة التكرار
    targets = [...new Set(targets)];

    for (const targetID of targets) {
      // 🛡️ [ حماية مطوري البوت - Anti-Kick ] 🛡️
      if (adminBot.includes(targetID)) {
        return message.reply(`${sidebar}🔒 [ 𝗦𝗬𝗦𝗧𝗘𝗠 𝗗𝗘𝗙𝗘𝗡𝗦𝗘 ]\n${line}\n${sidebar}Error 404: Your power level is too low to target Hanji. ⚠️👑\n${line}\n${sidebar}[ 𝗔𝗖𝗖𝗘𝗦𝗦 𝗗𝗘𝗡𝗜𝗘𝗗 ]`);
      }

      // حماية البوت نفسو
      if (targetID == api.getCurrentUserID()) return;

      try {
        const name = await usersData.getName(targetID);
        
        // 🖼️ التجهيز للإرسال (التصويرة + الميساج)
        const msg = {
            body: `[ 𝗭𝗬𝗣𝗛𝗘𝗥 - 𝗞𝗜𝗖𝗞 𝗗𝗘𝗣𝗟𝗢𝗬𝗘𝗗 ]\n${line}\n${sidebar}❯ 𝗧𝗔𝗥𝗚𝗘𝗧: ${name}\n${sidebar}❯ 𝗦𝗧𝗔𝗧𝗨𝗦: Terminated 🚮\n${line}`
        };

        if (fs.existsSync(imagePath)) {
            msg.attachment = fs.createReadStream(imagePath);
        }

        // إرسال "الوداع" قبل الطرد
        await api.sendMessage(msg, threadID);

        // التنفيذ
        await api.removeUserFromGroup(targetID, threadID);

      } catch (e) {
        console.error(e);
      }
    }
  }
};
