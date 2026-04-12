const fs = require("fs-extra");
const path = require("path");

if (!global.zypherDetect) global.zypherDetect = {};

module.exports = {
  config: {
    name: "detect",
    aliases: ["كشف"],
    version: "5.0.0",
    author: "Hanji",
    role: 2,
    shortDescription: "فضح المخربين بـ رسالة واحدة ووسم العـار",
    category: "SYSTEM",
    guide: { en: ".detect on | .detect off" }
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

  onEvent: async function ({ api, event, usersData }) {
    const { threadID, logMessageType, author } = event;
    const botID = api.getCurrentUserID();

    if (global.zypherDetect[threadID] && logMessageType === "log:thread-name") {
      if (author === botID) return;

      try {
        const realName = await usersData.getName(author);
        
        // 1. [ هـنـا الـرسـالـة الـوحـيـدة ]
        const singleMsg = `Look at [ ${realName} ] changing titles... 🤡 Reaction ❤️ = KICK.`;

        return api.sendMessage(singleMsg, threadID, (err, info) => {
          global.GoatBot.onReaction.set(info.messageID, {
            commandName: "detect",
            authorID: author
          });
        });
      } catch (e) {}
    }
  },

  onReaction: async function ({ api, event, reaction, handleReaction }) {
    const { threadID, userID } = event;
    const adminBot = global.GoatBot?.config?.adminBot || [];
    const threadInfo = await api.getThreadInfo(threadID);
    const isAdmin = threadInfo.adminIDs.some(a => a.id == userID);

    if ((isAdmin || adminBot.includes(userID.toString())) && reaction === "❤️" && handleReaction.authorID) {
      const victimID = handleReaction.authorID;

      try {
        // 2. [ هـنـا تـعـديـل الـكـنـيـة ]
        // تقدر تبدل هاد النص اللي بين القوسين بلي بغيتي
        await api.changeNickname(`𝗧𝗘𝗥𝗠𝗜𝗡𝗔𝗧𝗘𝗗_𝗕𝗬_𝗛𝗔𝗡𝗝𝗜`, threadID, victimID).catch(() => {});

        // التجريد من الرتبة والطرد
        await api.changeAdminStatus(threadID, victimID, false).catch(() => {});
        setTimeout(async () => {
          await api.removeUserFromGroup(victimID, threadID);
        }, 1500);

      } catch (e) {}
    }
  }
};
