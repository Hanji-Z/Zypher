const fs = require("fs-extra");
const path = require("path");

if (!global.zypherUnder) global.zypherUnder = {};

module.exports = {
  config: {
    name: "nam",
    aliases: ["1", "renameall"],
    version: "4.0.0",
    author: "Hanji & Gemini",
    role: 2, 
    shortDescription: "السيطرة الكاملة على الكنيات (تبديل/حذف/تثبيت)",
    category: "SYSTEM",
    guide: {
      en: "{pn} [Name] | {pn} del | {pn} Under [Name] | {pn} Under del | {pn} off"
    }
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, senderID, messageID } = event;
    const adminBot = global.GoatBot?.config?.adminBot || [];
    if (!adminBot.includes(senderID.toString())) return;

    if (!event.isGroup) return;

    let input = args.join(" ").trim();
    if (!input) return;

    // --- [ 1. إيقاف السيطرة ] ---
    if (input.toLowerCase() === "off") {
        delete global.zypherUnder[threadID];
        return api.setMessageReaction("✅", messageID, () => {}, true);
    }

    // --- [ 2. تحليل الأوامر والوضعية ] ---
    let isUnderMode = false;
    let targetName = input;
    let isDeleteMode = false;

    // وضعية الحذف (Normal or Under)
    if (input.toLowerCase() === "del" || input.toLowerCase() === "حذف") {
        targetName = "";
        isDeleteMode = true;
    } 
    else if (input.toLowerCase().startsWith("under ")) {
        isUnderMode = true;
        let subInput = input.slice(6).trim();
        
        if (subInput.toLowerCase() === "del") {
            targetName = "";
            isDeleteMode = true;
        } else {
            targetName = subInput;
        }
        // تثبيت الوضعية فـ الذاكرة (سواء كنية أو فراغ)
        global.zypherUnder[threadID] = targetName;
        api.setMessageReaction("🛡️", messageID, () => {}, true);
    }

    try {
      const botID = api.getCurrentUserID();

      async function massRename() {
          const threadInfo = await api.getThreadInfo(threadID);
          const currentNicknames = threadInfo.nicknames || {};
          const participantIDs = threadInfo.participantIDs;

          // فلترة: كنغيرو غير اللي سميتو ماشي هي الـ Target (باش نربحو الوقت)
          const membersToChange = participantIDs.filter(id => {
            const isOwner = (id === senderID); // صاحب الأمر كيبقى هو هاداك
            const current = currentNicknames[id] || "";
            return !isOwner && current !== targetName;
          });

          if (membersToChange.length === 0) return;

          const BATCH_SIZE = 4;
          const DELAY = 1000;

          for (let i = 0; i < membersToChange.length; i += BATCH_SIZE) {
            const batch = membersToChange.slice(i, i + BATCH_SIZE);
            await Promise.all(batch.map(userId => api.changeNickname(targetName, threadID, userId).catch(() => {})));
            if (i + BATCH_SIZE < membersToChange.length) await new Promise(res => setTimeout(res, DELAY));
          }
      }

      await massRename();
      if (!isUnderMode) api.setMessageReaction(isDeleteMode ? "🗑️" : "✅", messageID, () => {}, true);

    } catch (error) {
      console.error("❌ Error in .nam:", error);
    }
  },

  onEvent: async function ({ event, api }) {
    const { threadID, logMessageType, logMessageData, author } = event;
    const botID = api.getCurrentUserID();
    
    // فحص واش كاين شي تثبيت (Under Control) ناشط
    if (global.zypherUnder[threadID] === undefined) return;

    const protectedName = global.zypherUnder[threadID];

    // رادار 1: إرجاع الكنية المحمية (حتى لو كانت فارغة)
    if (logMessageType === "log:user-nickname") {
        if (author === botID) return;
        const { participant_id, nickname } = logMessageData;
        const newNick = nickname || "";
        if (newNick !== protectedName) {
            api.changeNickname(protectedName, threadID, participant_id).catch(() => {});
        }
    }

    // رادار 2: فرض الكنية على الأعضاء الجدد
    if (logMessageType === "log:subscribe") {
        const addedParticipants = logMessageData.addedParticipants;
        for (const user of addedParticipants) {
            api.changeNickname(protectedName, threadID, user.userFbId).catch(() => {});
        }
    }
  }
};
