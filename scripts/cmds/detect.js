if (!global.zypherDetect) global.zypherDetect = {};

module.exports = {
  config: {
    name: "detect",
    aliases: ["كشف"],
    version: "7.0.0",
    author: "Hanji",
    role: 2,
    shortDescription: "كشف المخربين وطردهم بأي تفاعل (أدمن)",
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
        // جلب المعلومات الحقيقية من السيرفر
        const info = await api.getUserInfo(author);
        const realName = info[author].name;
        const newName = logMessageData.name || "Unnamed";

        const msg = `Look at [ ${realName} ] changing title to "${newName}"... 🤡\n\n➜ React with ANY emoji to KICK this user.`;

        return api.sendMessage(msg, threadID, (err, info) => {
          if (err) return;
          
          // حفظ البيانات فـ الـ Reaction بنفس طريقة spamkick
          global.GoatBot.onReaction.set(info.messageID, {
            commandName: "detect", // هادي ضروري تكون نفس name الفوق
            authorID: author,
            messageID: info.messageID
          });
        });
      } catch (e) { console.error(e); }
    }
  },

  onReaction: async function ({ api, event, handleReaction }) {
    const { threadID, userID } = event;
    const adminBot = global.GoatBot.config.adminBot;
    
    try {
      // جلب معلومات لڭروب لفحص الرتب
      const threadInfo = await api.getThreadInfo(threadID);
      const isAdmin = threadInfo.adminIDs.some(a => a.id == userID);
      const isBotAdmin = adminBot.includes(userID.toString());

      // التحقق: خاص يكون يا أدمين لڭروب يا أدمين لبوت
      if (isAdmin || isBotAdmin) {
        const victimID = handleReaction.authorID;

        // 1. وسـم الخـائن (تبديل الكنية)
        await api.changeNickname(`𝘛𝘙𝘈𝘐𝘛𝘖𝘙_𝘡𝘌𝘙𝘖_𝘏𝘌𝘐𝘉𝘈`, threadID, victimID).catch(() => {});

        // 2. سحب الرتبة (إيلا كان أدمين)
        await api.changeAdminStatus(threadID, victimID, false).catch(() => {});

        // 3. الـطـرد النهائي
        setTimeout(async () => {
          await api.removeUserFromGroup(victimID, threadID).catch(() => {});
          // مسح الميساج باش ميبقاش صالح لتفاعل آخر
          api.unsendMessage(handleReaction.messageID).catch(() => {});
        }, 1000);
      }
    } catch (e) { console.error(e); }
  }
};
