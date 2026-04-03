module.exports = {
  config: {
    name: "nam",
    aliases: ["1", "renameall"],
    version: "1.6",
    author: "ShAn & Gemini",
    role: 2, // للمطور فقط
    shortDescription: "تغيير أسماء لڭروب كامل بـ زر واحد",
    category: "SYSTEM",
    guide: {
      en: "{pn} [الاسم] أو {pn} خاوي باش تمسح الكنيات"
    }
  },

  onStart: async function ({ api, event, args, message }) {
    const { threadID, participantIDs, senderID, messageID } = event;
    const sidebar = "█║ ";
    
    // 🛡️ سيكوريتي: التأكد من أن هانجي هو اللي كيهضر
    const adminBot = global.GoatBot?.config?.adminBot || [];
    if (!adminBot.includes(senderID)) {
        return message.reply(sidebar + "🚫 Error: Only the Bot Developer (Hanji) can execute this massive protocol.");
    }

    if (!event.isGroup) return message.reply(sidebar + "⚠️ This command must be used in a group!");

    try {
      const newName = args.join(" ").trim();
      const isDeleteMode = !newName;
      const targetName = isDeleteMode ? "" : newName;

      // تفاعل البدء 🖤
      api.setMessageReaction("🖤", messageID, () => {}, true);

      const botID = api.getCurrentUserID();
      
      // 1. تغيير كنية البوت أولاً
      try {
        await api.changeNickname(targetName, threadID, botID);
      } catch (e) { console.error("Bot Nickname Error"); }

      // 2. تصفية الأعضاء (تجنب المطور والبوت)
      const membersToChange = participantIDs.filter(id => id !== senderID && id !== botID);

      // 3. التنفيذ على دفعات (Batching) باش مايتبلوكاش البوت
      const BATCH_SIZE = 5; 
      const DELAY = 800; // زدت شوية فـ الوقت باش فيسبوك ما يعيقش

      for (let i = 0; i < membersToChange.length; i += BATCH_SIZE) {
        const batch = membersToChange.slice(i, i + BATCH_SIZE);
        
        await Promise.all(batch.map(userId => 
          api.changeNickname(targetName, threadID, userId).catch(() => {})
        ));

        if (i + BATCH_SIZE < membersToChange.length) {
          await new Promise(res => setTimeout(res, DELAY));
        }
      }

      // تفاعل الانتهاء ✅
      api.setMessageReaction("✅", messageID, () => {}, true);
      message.reply(sidebar + (isDeleteMode ? "تم حذف جميع الكنيات بنجاح." : `تم تغيير أسماء الجميع إلى: ${newName}`));

    } catch (error) {
      console.error("❌ Error in .nam:", error);
      api.setMessageReaction("❌", messageID, () => {}, true);
    }
  }
};
