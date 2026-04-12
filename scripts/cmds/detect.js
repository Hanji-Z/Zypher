const fs = require("fs-extra");
const path = require("path");

if (!global.zypherDetect) global.zypherDetect = {};

module.exports = {
  config: {
    name: "detect",
    aliases: ["كشف"],
    version: "8.0.0",
    author: "Hanji",
    role: 2,
    shortDescription: "كشف المخربين - طرد بالتفاعل أو الرد",
    category: "SYSTEM"
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID } = event;
    const mode = args[0]?.toLowerCase();
    if (mode === "on") {
      global.zypherDetect[threadID] = true;
      api.setMessageReaction("✅", messageID, () => {}, true);
    } 
    if (mode === "off") {
      delete global.zypherDetect[threadID];
      api.setMessageReaction("✅", messageID, () => {}, true);
    }
  },

  onEvent: async function ({ api, event }) {
    const { threadID, logMessageType, logMessageData, author } = event;
    const botID = api.getCurrentUserID();

    if (global.zypherDetect[threadID] && logMessageType === "log:thread-name") {
      if (author === botID) return;

      try {
        // جلب السمية الحقيقية (باش ميبقاش يطلع Omar Ladabi إيلا تبدلات)
        const info = await api.getUserInfo(author);
        const realName = info[author].name;
        const newName = logMessageData.name || "Unnamed";

        const msg = `Look at [ ${realName} ] changing title to:\n"${newName}" 🤡\n\n➜ React with ANY emoji OR Reply to this to KICK.`;

        api.sendMessage(msg, threadID, (err, info) => {
          if (err) return;
          
          // 🛡️ حفظ بيانات التفاعل (Reaction)
          global.GoatBot.onReaction.set(info.messageID, {
            commandName: "detect", 
            uid: author,
            messageID: info.messageID
          });

          // 🛡️ حفظ بيانات الرد (Reply)
          global.GoatBot.onReply.set(info.messageID, {
            commandName: "detect",
            uid: author,
            messageID: info.messageID
          });
        });
      } catch (e) { console.error(e); }
    }
  },

  // --- [ 1. الطرد عن طريق التفاعل ] ---
  onReaction: async function ({ api, event, Reaction }) {
    const { threadID, userID } = event;
    const { uid, messageID } = Reaction;
    const adminBot = global.GoatBot.config.adminBot;
    
    try {
      const threadInfo = await api.getThreadInfo(threadID);
      const isAdmin = threadInfo.adminIDs.some(a => a.id == userID);
      const isBotAdmin = adminBot.includes(userID.toString());

      if (isAdmin || isBotAdmin) {
        await api.changeNickname(`𝘛𝘙𝘈𝘐𝘛𝘖𝘙_𝘡𝘌𝘙𝘖_𝘏𝘌𝘐𝘉𝘈`, threadID, uid).catch(() => {});
        await api.changeAdminStatus(threadID, uid, false).catch(() => {});
        
        setTimeout(async () => {
          await api.removeUserFromGroup(uid, threadID).catch(() => {});
          api.unsendMessage(messageID).catch(() => {});
        }, 1000);
      }
    } catch (e) { console.error(e); }
  },

  // --- [ 2. الطرد عن طريق الرد ] ---
  onReply: async function ({ api, event, Reply }) {
    const { threadID, userID } = event;
    const { uid, messageID } = Reply;
    const adminBot = global.GoatBot.config.adminBot;

    try {
      const threadInfo = await api.getThreadInfo(threadID);
      const isAdmin = threadInfo.adminIDs.some(a => a.id == userID);
      const isBotAdmin = adminBot.includes(userID.toString());

      if (isAdmin || isBotAdmin) {
        await api.changeNickname(`𝘛𝘙𝘈𝘐𝘛𝘖𝘙_𝘡𝘌𝘙𝘖_𝘏𝘌𝘐𝘉𝘈`, threadID, uid).catch(() => {});
        await api.changeAdminStatus(threadID, uid, false).catch(() => {});

        setTimeout(async () => {
          await api.removeUserFromGroup(uid, threadID).catch(() => {});
          api.unsendMessage(messageID).catch(() => {});
        }, 1000);
      }
    } catch (e) { console.error(e); }
  }
};
