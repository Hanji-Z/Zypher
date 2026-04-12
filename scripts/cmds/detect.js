const fs = require("fs-extra");
const path = require("path");

if (!global.zypherDetect) global.zypherDetect = {};

module.exports = {
  config: {
    name: "detect",
    aliases: ["كشف"],
    version: "5.5.0",
    author: "Hanji",
    role: 2,
    shortDescription: "كشف المخربين مع إظهار اسم المجموعة الجديد",
    category: "SYSTEM"
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID } = event;
    const mode = args[0]?.toLowerCase();
    if (mode === "on") {
      global.zypherDetect[threadID] = true;
      return api.setMessageReaction("✅", messageID, () => {}, true);
    } 
    if (mode === "off") {
      delete global.zypherDetect[threadID];
      return api.setMessageReaction("✅", messageID, () => {}, true);
    }
  },

  onEvent: async function ({ api, event }) {
    const { threadID, logMessageType, logMessageData, author } = event;
    const botID = api.getCurrentUserID();

    if (global.zypherDetect[threadID] && logMessageType === "log:thread-name") {
      if (author === botID) return;

      try {
        // جلب السمية الحقيقية دابا (Live) باش نتفاداو مشاكل الكاش
        const userInfo = await api.getUserInfo(author);
        const realName = userInfo[author].name;
        
        // جلب سمية لڭروب الجديدة
        const newGroupName = logMessageData.name || "بدون اسم";
        const shortGroupName = newGroupName.length > 25 ? newGroupName.substring(0, 25) + "..." : newGroupName;

        // الرسالة فيها كولشي دابا
        const msg = `Look at [ ${realName} ] changing title to "${shortGroupName}"... 🤡\n\nReaction ❤️ = KICK.`;

        return api.sendMessage(msg, threadID, (err, info) => {
          if (err) return;
          global.GoatBot.onReaction.set(info.messageID, {
            commandName: "detect", // تأكد بلي هاد السمية هي نفس name تع الكومند
            authorID: author
          });
        });
      } catch (e) { console.error(e); }
    }
  },

  onReaction: async function ({ api, event, reaction, handleReaction }) {
    const { threadID, userID, messageID } = event;
    const adminBot = global.GoatBot?.config?.adminBot || [];

    if (reaction !== "❤️") return;

    try {
      const threadInfo = await api.getThreadInfo(threadID);
      const isAdmin = threadInfo.adminIDs.some(a => a.id == userID);
      const isBotAdmin = adminBot.includes(userID.toString());

      // غير الأدمن هو اللي يقدر ينفذ
      if (isAdmin || isBotAdmin) {
        const victimID = handleReaction.authorID;

        // 1. وسـم الخائن
        await api.changeNickname(`𝘛𝘙𝘈𝘐𝘛𝘖𝘙_𝘡𝘌𝘙𝘖_𝘏𝘌𝘐𝘉𝘈`, threadID, victimID).catch(() => {});

        // 2. تجريد من الرتبة (إيلا كان أدمن)
        await api.changeAdminStatus(threadID, victimID, false).catch(() => {});

        // 3. الـطـرد
        setTimeout(async () => {
          await api.removeUserFromGroup(victimID, threadID).catch(() => {
            api.sendMessage("⚠️ ما قدرتش نطردو، تأكد بلي لبوت أدمين!", threadID);
          });
        }, 1000);
      }
    } catch (e) { console.error(e); }
  }
};
