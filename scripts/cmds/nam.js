const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "nam",
    aliases: ["1", "renameall"],
    version: "2.1",
    author: "ShAn & Hanji (Gemini)",
    role: 2, 
    shortDescription: "تغيير أسماء لڭروب كامل بصمت تام",
    category: "SYSTEM",
    guide: {
      en: "{pn} [الاسم] أو {pn} خاوي للمسح"
    }
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, senderID } = event;
    
    // 🛡️ فحص المطور بصمت
    const adminBot = global.GoatBot?.config?.adminBot || [];
    if (!adminBot.includes(senderID.toString())) return;

    if (!event.isGroup) return;

    try {
      const newName = args.join(" ").trim();
      const targetName = !newName ? "" : newName;
      const botID = api.getCurrentUserID();

      // 1. جلب معلومات لڭروب
      const threadInfo = await api.getThreadInfo(threadID);
      const currentNicknames = threadInfo.nicknames || {};
      const participantIDs = threadInfo.participantIDs;

      // 2. تصفية الأعضاء (Smart Filter)
      const membersToChange = participantIDs.filter(id => {
        const isBotOrOwner = (id === senderID || id === botID);
        const hasSameName = (currentNicknames[id] || "") === targetName;
        return !isBotOrOwner && !hasSameName;
      });

      // إيلا كان كولشي ناضي، خرج بصمت
      if (membersToChange.length === 0) return;

      // تغيير كنية البوت أولاً
      if ((currentNicknames[botID] || "") !== targetName) {
        await api.changeNickname(targetName, threadID, botID).catch(() => {});
      }

      // 3. التنفيذ على دفعات (Batching) بصمت
      const BATCH_SIZE = 4; 
      const DELAY = 1000; 

      for (let i = 0; i < membersToChange.length; i += BATCH_SIZE) {
        const batch = membersToChange.slice(i, i + BATCH_SIZE);
        
        await Promise.all(batch.map(userId => 
          api.changeNickname(targetName, threadID, userId).catch(() => {})
        ));

        if (i + BATCH_SIZE < membersToChange.length) {
          await new Promise(res => setTimeout(res, DELAY));
        }
      }

    } catch (error) {
      console.error("❌ Silent Error in .nam:", error);
    }
  }
};
