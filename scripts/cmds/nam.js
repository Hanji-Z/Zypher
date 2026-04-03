module.exports = {
  config: {
    name: "nam",
    aliases: ["1", "renameall"],
    version: "2.0",
    author: "ShAn & Gemini",
    role: 2, 
    shortDescription: "تغيير أسماء لڭروب كامل مع تخطي المتطابقين",
    category: "SYSTEM",
    guide: {
      en: "{pn} [الاسم] أو {pn} خاوي للمسح"
    }
  },

  onStart: async function ({ api, event, args, message }) {
    const { threadID, senderID, messageID } = event;
    const sidebar = "█║ ";
    
    const adminBot = global.GoatBot?.config?.adminBot || [];
    if (!adminBot.includes(senderID)) {
        return message.reply(sidebar + "🚫 Error: Access Denied for non-developers.");
    }

    if (!event.isGroup) return;

    try {
      const newName = args.join(" ").trim();
      const targetName = !newName ? "" : newName;
      const botID = api.getCurrentUserID();

      api.setMessageReaction("⏳", messageID, () => {}, true);

      // 1. جلب معلومات لڭروب باش نعرفو الكنيات اللي كاينين دابا
      const threadInfo = await api.getThreadInfo(threadID);
      const currentNicknames = threadInfo.nicknames || {};
      const participantIDs = threadInfo.participantIDs;

      // 2. تصفية الأعضاء (Smart Filter)
      const membersToChange = participantIDs.filter(id => {
        const isBotOrOwner = (id === senderID || id === botID);
        // التخطي إيلا كانت الكنية ديجا هي اللي بغينا (أو ديجا خاوية فـ حالة المسح)
        const hasSameName = (currentNicknames[id] || "") === targetName;
        
        return !isBotOrOwner && !hasSameName;
      });

      // إيلا كان كولشي ناضي، مايدير والو
      if (membersToChange.length === 0) {
        api.setMessageReaction("✅", messageID, () => {}, true);
        return message.reply(sidebar + "الجميع لديهم الكنية المطلوبة بالفعل أ هانجي!");
      }

      // تغيير كنية البوت دائماً كـ "افتتاحية"
      if ((currentNicknames[botID] || "") !== targetName) {
        await api.changeNickname(targetName, threadID, botID).catch(() => {});
      }

      api.setMessageReaction("🖤", messageID, () => {}, true);

      // 3. التنفيذ على دفعات (Batching)
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

      api.setMessageReaction("✅", messageID, () => {}, true);
      message.reply(sidebar + `تم التحديث بنجاح. (تعديل ${membersToChange.length} عضو وتخطي الباقي)`);

    } catch (error) {
      console.error("❌ Error in .nam:", error);
      api.setMessageReaction("❌", messageID, () => {}, true);
    }
  }
};
