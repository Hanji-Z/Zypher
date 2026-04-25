module.exports = {
  config: {
    name: "antiout",
    version: "2.0",
    author: "Hanji", // Rebranded to Hanji
    countDown: 5,
    role: 1, // للأدمنات فقط
    shortDescription: "Anti-Out with Kick Detection",
    category: "GROUP",
    guide: "{pn} on | off | kick on"
  },

  onStart: async function({ api, event, threadsData, args }) {
    const { threadID, messageID } = event;
    const mode = args.join(" ").toLowerCase();

    if (mode === "on") {
      // وضع التشغيل العادي (إعادة من خرج فقط)
      await threadsData.set(threadID, "on", "settings.antiout");
      return api.setMessageReaction("✅", messageID, () => {}, true);
    } 
    else if (mode === "kick on") {
      // وضع الطرد (إعادة الجميع حتى لو تم طردهم)
      await threadsData.set(threadID, "kick", "settings.antiout");
      return api.setMessageReaction("🔥", messageID, () => {}, true);
    } 
    else if (mode === "off") {
      // إيقاف الأمر
      await threadsData.set(threadID, false, "settings.antiout");
      return api.setMessageReaction("❌", messageID, () => {}, true);
    } 
    else {
      // في حالة كتابة أمر خاطئ، يتفاعل بإيموجي تنبيه
      return api.setMessageReaction("⚠️", messageID, () => {}, true);
    }
  },

  onEvent: async function({ api, event, threadsData }) {
    const { threadID, logMessageType, logMessageData, author } = event;

    // التأكد من أن الحدث هو خروج أو طرد
    if (logMessageType === "log:unsubscribe") {
      const antioutStatus = await threadsData.get(threadID, "settings.antiout");
      if (!antioutStatus) return;

      const leftID = logMessageData.leftParticipantFbId;
      const botID = api.getCurrentUserID();

      // تجاهل إذا كان البوت هو من خرج
      if (leftID === botID) return;

      /* Logic Check:
         - author == leftID  => الشخص خرج بيده (Voluntary Leave)
         - author != leftID  => شخص آخر طرده (Kicked by Admin)
      */
      const isVoluntary = (author === leftID);

      if (antioutStatus === "on") {
        // الوضع العادي: رجع غير لي خرج بوحدو
        if (isVoluntary) {
          try {
            await api.addUserToGroup(leftID, threadID);
            console.log(`[ ZYPHER ] Added back ${leftID} (Voluntary Leave)`);
          } catch (e) {
            console.log(`[ ZYPHER ] Error adding back: ${e.message}`);
          }
        }
      } 
      else if (antioutStatus === "kick") {
        // وضع Kick On: رجع أي واحد خرج بيده أو تطرد
        try {
          await api.addUserToGroup(leftID, threadID);
          console.log(`[ ZYPHER ] Added back ${leftID} (Force Re-entry)`);
        } catch (e) {
          console.log(`[ ZYPHER ] Error adding back: ${e.message}`);
        }
      }
    }
  }
};
