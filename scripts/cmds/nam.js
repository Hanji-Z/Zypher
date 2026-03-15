module.exports = {
  config: {
    name: "nam",
    aliases: ["1", "renameall"],
    version: "1.5",
    author: "ShAn & Gemini",
    role: 2,
    shortDescription: "تغيير الأسماء مع البدء بالبوت وتخطي المتطابقين",
    category: "المالك",
    guide: {
      en: "{pn} [الاسم] للتغيير، أو {pn} فقط لحذف الكنيات"
    }
  },

  onStart: async function ({ api, event, args }) {
    try {
      const OWNER_ID = "61574764452026";
      
      if (event.senderID !== OWNER_ID || !event.isGroup) return;

      const { threadID, participantIDs } = event;
      const newName = args.join(" ").trim();
      const isDeleteMode = !newName;
      const targetName = isDeleteMode ? "" : newName;

      if (!isDeleteMode && newName.length > 500) return;

      const botID = api.getCurrentUserID();
      
      // تفاعل البدء 🖤
      api.setMessageReaction("🖤", event.messageID, () => {}, true);

      // جلب معلومات المجموعة لفحص الكنيات الحالية للأعضاء
      const threadInfo = await api.getThreadInfo(threadID);
      const currentNicknames = threadInfo.nicknames || {};

      // ===== المرحلة 1: البوت يبدأ دائماً بكنيته أولاً =====
      try {
        await api.changeNickname(targetName, threadID, botID);
      } catch (error) {
        console.error("خطأ في تغيير كنية البوت");
      }

      // ===== المرحلة 2: تصفية الأعضاء وتغيير من يحتاج فقط =====
      const membersToChange = participantIDs.filter(id => {
        const isOwnerOrBot = (id === OWNER_ID || id === botID);
        const hasSameName = (currentNicknames[id] || "") === targetName;
        // نأخذ فقط العضو الذي ليس المالك/البوت واسمه مختلف عن الاسم المطلوب
        return !isOwnerOrBot && !hasSameName;
      });

      // إذا كان الجميع بنفس الاسم، نضع علامة الصح وننتهي
      if (membersToChange.length === 0) {
        return api.setMessageReaction("✅", event.messageID, () => {}, true);
      }

      const BATCH_SIZE = 3; 
      const DELAY_BETWEEN_BATCHES = 300; 

      for (let i = 0; i < membersToChange.length; i += BATCH_SIZE) {
        const batch = membersToChange.slice(i, i + BATCH_SIZE);
        
        const batchPromises = batch.map(userId =>
          api.changeNickname(targetName, threadID, userId).catch(() => {})
        );
        
        await Promise.all(batchPromises);
        
        if (i + BATCH_SIZE < membersToChange.length) {
          await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
        }
      }

      // تفاعل الانتهاء ✅
      api.setMessageReaction("✅", event.messageID, () => {}, true);

    } catch (error) {
      console.error("❌ خطأ في .nam:", error);
    }
  }
};
