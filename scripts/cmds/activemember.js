const axios = require('axios');

module.exports = {
  config: {
    name: "activemember",
    aliases: ["am", "top"],
    version: "2.0.0",
    author: "Zypher",
    countDown: 10,
    role: 0,
    shortDescription: { en: "Get the top active users in the chat" },
    longDescription: { en: "Analyze the last 1000 messages and rank top 20 active members" },
    category: "GROUP",
    guide: { en: "{pn}" },
  },

  onStart: async function ({ api, event }) {
    const { threadID, messageID, senderID } = event;
    const sidebar = "█║ ";
    const line = "█║──────────────────";

    api.setMessageReaction("📊", messageID, () => {}, true);

    try {
      // 1. جلب معلومات الڭروب والميساجات (آخر 1000 ميساج)
      const threadInfo = await api.getThreadInfo(threadID);
      const messages = await api.getThreadHistory(threadID, 1000);

      const messageCounts = {};
      // تجهيز العداد لكل واحد فـ الڭروب
      threadInfo.participantIDs.forEach(id => messageCounts[id] = 0);

      // حساب الميساجات
      messages.forEach(msg => {
        if (messageCounts[msg.senderID] !== undefined) {
          messageCounts[msg.senderID]++;
        }
      });

      // ترتيب التوب 20 (بركة باش ما يجيش الميساج طويل بزاف)
      const topUsers = Object.entries(messageCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .filter(u => u[1] > 0); // حيد اللي ما صيفطو والو

      if (topUsers.length === 0) return api.sendMessage(sidebar + "لڭروب ميت، ما كاين حتى " + "Active Member" + " هنا!", threadID, messageID);

      // --- [ OPTIMIZATION ] ---
      // جبد المعلومات ديالهم كاملين فـ دقة وحدة عوض Loop
      const userIDs = topUsers.map(u => u[0]);
      const allUsersInfo = await api.getUserInfo(userIDs);

      let msg = `[ 𝗭𝗬𝗣𝗛𝗘𝗥 - 𝗔𝗖𝗧𝗜𝗩𝗘 𝗥𝗔𝗡𝗞 ]\n${line}\n`;
      
      topUsers.forEach((user, index) => {
        const uid = user[0];
        const count = user[1];
        const name = allUsersInfo[uid]?.name || "Unknown User";
        const medal = index === 0 ? "👑" : index === 1 ? "🥈" : index === 2 ? "🥉" : "👤";
        
        msg += `${sidebar}${medal} ${index + 1}. **${name}**\n${sidebar}   ┗ 📊 الميساجات: ${count}\n\n`;
      });

      msg += `${line}\n${sidebar}💡 **Note**: هاد الحساب مبني على آخر 1000 ميساج.\n${sidebar}[ 𝗦𝗬𝗦𝗧𝗘𝗠 𝗢𝗣𝗘𝗥𝗔𝗧𝗜𝗢𝗡𝗔𝗟 ]`;

      return api.sendMessage({ 
        body: msg, 
        mentions: [{ tag: "Master", id: senderID }] 
      }, threadID, messageID);

    } catch (error) {
      console.error(error);
      api.sendMessage(sidebar + "وقع مشكل فـ تحليل الداتا. فيسبوك كيزيّر الحماية.", threadID, messageID);
    }
  },
};
