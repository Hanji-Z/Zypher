const fs = require("fs-extra");
const path = require("path");

if (!global.zypherUnder) global.zypherUnder = {};
if (!global.zypherLocks) global.zypherLocks = {};

module.exports = {
  config: {
    name: "nam",
    aliases: ["1", "renameall"],
    version: "5.0",
    author: "Hanji & ShAn",
    role: 2,
    shortDescription: "السيطرة الكاملة على الكنيات",
    category: "SYSTEM",
    guide: {
      en: "{pn} [اسم]           — تغيير كنية الكل\n"
        + "{pn} del             — حذف كنية الكل\n"
        + "{pn} under [اسم]    — تثبيت كنية للكل (مستمر)\n"
        + "{pn} under del       — تثبيت فراغ للكل\n"
        + "{pn} stop/off        — إيقاف وضع Under\n"
        + "──────────────────────\n"
        + "رد على رسالة + {pn} [اسم]   — تغيير كنية شخص محدد\n"
        + "رد على رسالة + {pn} del      — حذف كنية شخص محدد\n"
        + "رد على رسالة + {pn} lock [اسم] — تثبيت كنية شخص (لا يمكن تغييرها)\n"
        + "رد على رسالة + {pn} unlock   — فك تثبيت كنية شخص"
    }
  },

  onStart: async function ({ api, event, args, message }) {
    const { threadID, senderID, messageID, messageReply } = event;
    const adminBot = global.GoatBot?.config?.adminBot || [];
    if (!adminBot.includes(senderID.toString())) return;
    if (!event.isGroup) return;

    let input = args.join(" ").trim();
    if (!input) return;

    const inputLower = input.toLowerCase();

    // ─── [ إيقاف وضع Under ] ───
    if (["off", "stop", "وقف", "ايقاف"].includes(inputLower)) {
      delete global.zypherUnder[threadID];
      return api.setMessageReaction("✅", messageID, () => {}, true);
    }

    // ─── [ رد على شخص محدد ] ───
    if (messageReply) {
      const targetUserID = messageReply.senderID;
      const lockKey = `${threadID}_${targetUserID}`;

      if (["unlock", "فك", "الغاء"].includes(inputLower)) {
        delete global.zypherLocks[lockKey];
        return api.setMessageReaction("🔓", messageID, () => {}, true);
      }

      if (inputLower.startsWith("lock") || inputLower.startsWith("ثبت")) {
        const lockName = input.slice(inputLower.startsWith("lock") ? 4 : 3).trim();
        global.zypherLocks[lockKey] = lockName;
        await api.changeNickname(lockName, threadID, targetUserID).catch(() => {});
        return api.setMessageReaction("🔒", messageID, () => {}, true);
      }

      const targetName = (inputLower === "del" || inputLower === "حذف") ? "" : input;
      await api.changeNickname(targetName, threadID, targetUserID).catch(() => {});
      return api.setMessageReaction("✅", messageID, () => {}, true);
    }

    // ─── [ أوامر الكل ] ───
    let isUnderMode = false;
    let targetName = input;
    let isDeleteMode = false;

    if (inputLower === "del" || inputLower === "حذف") {
      targetName = "";
      isDeleteMode = true;
    } else if (inputLower.startsWith("under ")) {
      isUnderMode = true;
      const subInput = input.slice(6).trim();
      if (subInput.toLowerCase() === "del") {
        targetName = "";
        isDeleteMode = true;
      } else {
        targetName = subInput;
      }
      global.zypherUnder[threadID] = targetName;
      api.setMessageReaction("🛡️", messageID, () => {}, true);
    }

    try {
      async function massRename() {
        const threadInfo = await api.getThreadInfo(threadID);
        const currentNicknames = threadInfo.nicknames || {};
        const participantIDs = threadInfo.participantIDs;

        const membersToChange = participantIDs.filter(id => {
          if (id === senderID) return false;
          const current = currentNicknames[id] || "";
          return current !== targetName;
        });

        if (membersToChange.length === 0) return;

        const BATCH_SIZE = 4;
        const DELAY = 1000;
        for (let i = 0; i < membersToChange.length; i += BATCH_SIZE) {
          const batch = membersToChange.slice(i, i + BATCH_SIZE);
          await Promise.all(batch.map(id => api.changeNickname(targetName, threadID, id).catch(() => {})));
          if (i + BATCH_SIZE < membersToChange.length)
            await new Promise(r => setTimeout(r, DELAY));
        }
      }

      await massRename();
      if (!isUnderMode)
        api.setMessageReaction(isDeleteMode ? "🗑️" : "✅", messageID, () => {}, true);

    } catch (err) {
      console.error("❌ Error in .nam:", err);
    }
  },

  onEvent: async function ({ event, api }) {
    const { threadID, logMessageType, logMessageData, author } = event;
    const botID = api.getCurrentUserID();

    // ─── حماية الكنيات عند التغيير ───
    if (logMessageType === "log:user-nickname") {
      if (author === botID) return;
      const { participant_id, nickname } = logMessageData;
      const newNick = nickname || "";
      const lockKey = `${threadID}_${participant_id}`;

      if (global.zypherLocks[lockKey] !== undefined) {
        const locked = global.zypherLocks[lockKey];
        if (newNick !== locked)
          api.changeNickname(locked, threadID, participant_id).catch(() => {});
        return;
      }

      if (global.zypherUnder[threadID] !== undefined) {
        const protected_ = global.zypherUnder[threadID];
        if (newNick !== protected_)
          api.changeNickname(protected_, threadID, participant_id).catch(() => {});
      }
    }

    // ─── فرض الكنية على الأعضاء الجدد ───
    if (logMessageType === "log:subscribe") {
      for (const user of (logMessageData.addedParticipants || [])) {
        const uid = user.userFbId;
        const lockKey = `${threadID}_${uid}`;
        if (global.zypherLocks[lockKey] !== undefined)
          api.changeNickname(global.zypherLocks[lockKey], threadID, uid).catch(() => {});
        else if (global.zypherUnder[threadID] !== undefined)
          api.changeNickname(global.zypherUnder[threadID], threadID, uid).catch(() => {});
      }
    }
  }
};
