const fs = require("fs-extra");
const path = require("path");

if (!global.zypherUnder) global.zypherUnder = {};

module.exports = {
  config: {
    name: "nam",
    aliases: ["1", "renameall"],
    version: "3.0.0",
    author: "ShAn & Hanji (Gemini)",
    role: 2, 
    shortDescription: "إدارة الكنيات بوضعية Under Control",
    category: "SYSTEM",
    guide: {
      en: "{pn} [Name] | {pn} Under [Name] | {pn} off"
    }
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, senderID, messageID } = event;
    const adminBot = global.GoatBot?.config?.adminBot || [];
    if (!adminBot.includes(senderID.toString())) return;

    if (!event.isGroup) return;

    let input = args.join(" ").trim();
    if (!input) return;

    // --- [ 1. التعامل مع وضعية الإلغاء ] ---
    if (input.toLowerCase() === "off") {
        delete global.zypherUnder[threadID];
        return api.setMessageReaction("✅", messageID, () => {}, true);
    }

    // --- [ 2. تحديد نوع العملية: Under أو عادية ] ---
    let isUnderMode = false;
    let targetName = input;

    if (input.toLowerCase().startsWith("under ")) {
        isUnderMode = true;
        targetName = input.slice(6).trim();
        global.zypherUnder[threadID] = targetName;
        api.setMessageReaction("🛡️", messageID, () => {}, true);
    }

    try {
      const botID = api.getCurrentUserID();

      // وظيفة تغيير الكنيات الجماعية
      async function massRename() {
          const threadInfo = await api.getThreadInfo(threadID);
          const currentNicknames = threadInfo.nicknames || {};
          const participantIDs = threadInfo.participantIDs;

          const membersToChange = participantIDs.filter(id => {
            const isBotOrOwner = (id === senderID || id === botID);
            const hasSameName = (currentNicknames[id] || "") === targetName;
            return !isBotOrOwner && !hasSameName;
          });

          if (membersToChange.length === 0) return;

          // كنية البوت أولاً
          if ((currentNicknames[botID] || "") !== targetName) {
            await api.changeNickname(targetName, threadID, botID).catch(() => {});
          }

          const BATCH_SIZE = 4;
          const DELAY = 1000;

          for (let i = 0; i < membersToChange.length; i += BATCH_SIZE) {
            const batch = membersToChange.slice(i, i + BATCH_SIZE);
            await Promise.all(batch.map(userId => api.changeNickname(targetName, threadID, userId).catch(() => {})));
            if (i + BATCH_SIZE < membersToChange.length) await new Promise(res => setTimeout(res, DELAY));
          }

          // 🛡️ [ الضربة النهائية ] : التأكد من أن كولشي تبدل
          const finalCheck = await api.getThreadInfo(threadID);
          const finalNicknames = finalCheck.nicknames || {};
          for (const id of participantIDs) {
              if (id !== senderID && id !== botID && (finalNicknames[id] || "") !== targetName) {
                  api.changeNickname(targetName, threadID, id).catch(() => {});
              }
          }
      }

      await massRename();
      if (!isUnderMode) api.setMessageReaction("✅", messageID, () => {}, true);

    } catch (error) {
      console.error("❌ Error in .nam:", error);
    }
  },

  // --- [ 3. الرادارات: حماية الكنية + ترحيب الكنية ] ---
  onEvent: async function ({ event, api }) {
    const { threadID, logMessageType, logMessageData, author } = event;
    const botID = api.getCurrentUserID();
    const protectedName = global.zypherUnder[threadID];

    if (!protectedName) return;

    // رادار: إرجاع الكنية إذا تم تغييرها
    if (logMessageType === "log:user-nickname") {
        if (author === botID) return; // البوت ما يرجعش كنيتو براسو
        const { participant_id, nickname } = logMessageData;
        
        // إيلا كانت الكنية الجديدة ماشي هي المحمية، رجعها ديريكت
        if (nickname !== protectedName) {
            api.changeNickname(protectedName, threadID, participant_id);
        }
    }

    // رادار: وضع الكنية لأي واحد دخل لڭروب جديد
    if (logMessageType === "log:subscribe") {
        const addedParticipants = logMessageData.addedParticipants;
        for (const user of addedParticipants) {
            api.changeNickname(protectedName, threadID, user.userFbId).catch(() => {});
        }
    }
  }
};
