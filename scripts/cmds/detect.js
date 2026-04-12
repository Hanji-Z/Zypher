const fs = require("fs-extra");
const path = require("path");

if (!global.zypherDetect) global.zypherDetect = {};

module.exports = {
  config: {
    name: "detect",
    aliases: ["كشف"],
    version: "5.1.0",
    author: "Hanji",
    role: 2,
    shortDescription: "كشف المخربين مع نظام تتبع الأخطاء",
    category: "SYSTEM"
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
    const { threadID, logMessageType, logMessageData, author } = event;
    const botID = api.getCurrentUserID();

    if (global.zypherDetect[threadID] && logMessageType === "log:thread-name") {
      if (author === botID) return;

      try {
        const realName = await usersData.getName(author);
        const singleMsg = `Look at [ ${realName} ] changing titles... 🤡 Reaction ❤️ = KICK.`;

        return api.sendMessage(singleMsg, threadID, (err, info) => {
          if (err) return console.error("❌ Error sending detect message:", err);
          global.GoatBot.onReaction.set(info.messageID, {
            commandName: "detect",
            authorID: author
          });
        });
      } catch (e) { console.error("❌ Error in onEvent detect:", e); }
    }
  },

  onReaction: async function ({ api, event, reaction, handleReaction }) {
    const { threadID, userID, messageID } = event;
    const adminBot = global.GoatBot?.config?.adminBot || [];

    // 1. فحص التفاعل
    if (reaction !== "❤️") return;

    try {
      console.log(`[ DEBUG ] Reaction detected from: ${userID}`);
      
      const threadInfo = await api.getThreadInfo(threadID);
      // تصحيح فحص الأدمن (بعض المرات كيكون أوبجيكت وبعض المرات سترينغ)
      const isAdmin = threadInfo.adminIDs.some(a => a.id == userID || a == userID);
      const isBotAdmin = adminBot.includes(userID.toString());

      if (isAdmin || isBotAdmin) {
        console.log(`[ DEBUG ] Authorized admin detected. Starting execution...`);
        const victimID = handleReaction.authorID;

        // 2. تغيير الكنية (وسم العار)
        console.log(`[ DEBUG ] Changing nickname for: ${victimID}`);
        await api.changeNickname(`𝘛𝘙𝘈𝘐𝘛𝘖𝘙_𝘡𝘌𝘙𝘖_𝘏𝘌𝘐𝘉𝘈`, threadID, victimID).catch(err => console.log("Failed to change nick:", err));

        // 3. التجريد من الرتبة (إيلا كان المخرب أدمين)
        await api.changeAdminStatus(threadID, victimID, false).catch(() => {});

        // 4. الطرد
        console.log(`[ DEBUG ] Kicking victim: ${victimID}`);
        setTimeout(async () => {
          await api.removeUserFromGroup(victimID, threadID).catch(err => {
            console.error("❌ Failed to kick user:", err);
            api.sendMessage("⚠️ ما قدرتش نطردو، تأكد بلي لبوت أدمين!", threadID);
          });
        }, 1500);

      } else {
        console.log(`[ DEBUG ] User ${userID} is NOT an admin. Ignoring reaction.`);
      }
    } catch (e) {
      console.error("❌ Error in onReaction detect:", e);
    }
  }
};
