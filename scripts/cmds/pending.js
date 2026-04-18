const axios = require("axios");

module.exports = {
  config: {
    name: "pending",
    aliases: ["pen", "pend", "pe"],
    version: "2.0.0",
    author: "Hanji",
    countDown: 5,
    role: 1, // مشرفي البوت
    shortDescription: { en: "Manage pending group requests" },
    category: "SYSTEM",
  },

  onReply: async function ({ message, api, event, Reply }) {
    const { author, pending, messageID } = Reply;
    if (String(event.senderID) !== String(author)) return;

    const { body, threadID } = event;
    const sidebar = "​❯ ";

    if (body.trim().toLowerCase() === "c") {
      try {
        await api.unsendMessage(messageID);
        return api.sendMessage(`[ 𝗭𝗬𝗣𝗛𝗘𝗥 𝗦𝗬𝗦𝗧𝗘𝗠 - 𝗔𝗕𝗢𝗥𝗧 ]\n╼━━━━━━━━━━━━╾\n${sidebar}تم إلغاء العملية بنجاح!`, threadID);
      } catch { return; }
    }

    const indexes = body.split(/\s+/).map(Number);
    if (isNaN(indexes[0])) return api.sendMessage(`⚠️ الرقم اللي دخلتي ماشي هو هاداك أ هانجي!`, threadID);

    let count = 0;
    for (const idx of indexes) {
      if (idx <= 0 || idx > pending.length) continue;
      const group = pending[idx - 1];

      try {
        await api.sendMessage(
          `[ 𝗭𝗬𝗣𝗛𝗘𝗥 𝗦𝗬𝗦𝗧𝗘𝗠 - 𝗔𝗖𝗖𝗘𝗦𝗦 ]\n╼━━━━━━━━━━━━╾\n${sidebar}تمت الموافقة على الڭروب بنجاح!\n${sidebar}استخدم ${global.GoatBot.config.prefix}help للبدء.`,
          group.threadID
        );

        await api.changeNickname(
          `${global.GoatBot.config.nickNameBot || "—「𝗭𝗬𝗣𝗛𝗘𝗥 𝗕𝗢𝗧」"}`,
          group.threadID,
          api.getCurrentUserID()
        );
        count++;
      } catch { count++; }
    }

    return api.sendMessage(
      `[ 𝗭𝗬𝗣𝗛𝗘𝗥 𝗦𝗬𝗦𝗧𝗘𝗠 - 𝗗𝗢𝗡𝗘 ]\n╼━━━━━━━━━━━━╾\n${sidebar}تم تفعيل ${count} ڭروبات جديدة بنجاح! ✅`,
      threadID
    );
  },

  onStart: async function ({ api, event, args, usersData }) {
    const { threadID, messageID } = event;
    const sidebar = "​❯ ";
    const adminBot = global.GoatBot.config.adminBot;

    if (!adminBot.includes(event.senderID)) {
      return api.sendMessage(`⚠️ ماعندكش الصلاحية لخدمة هاد السيستيم!`, threadID);
    }

    const type = args[0]?.toLowerCase();
    if (!type) return api.sendMessage(`[ 𝗭𝗬𝗣𝗛𝗘𝗥 - 𝗜𝗡𝗙𝗢 ]\n╼━━━━━━━━━━━━╾\n${sidebar}استعمل: .pending [user/thread/all]`, threadID);

    try {
      const spam = (await api.getThreadList(100, null, ["OTHER"])) || [];
      const pending = (await api.getThreadList(100, null, ["PENDING"])) || [];
      const list = [...spam, ...pending];

      let filteredList = [];
      if (type.startsWith("u")) filteredList = list.filter((t) => !t.isGroup);
      else if (type.startsWith("t")) filteredList = list.filter((t) => t.isGroup);
      else if (type === "all") filteredList = list;

      if (filteredList.length === 0) return api.sendMessage(`[ 𝗭𝗬𝗣𝗛𝗘𝗥 ]\n╼━━━━━━━━━━━━╾\n${sidebar}قاعة الانتظار خاوية حالياً! ☕`, threadID);

      let msg = "";
      for (let i = 0; i < filteredList.length; i++) {
        const name = filteredList[i].name || (await usersData.getName(filteredList[i].threadID)) || "Unknown";
        msg += `${sidebar}[ ${i + 1} ] : ${name}\n`;
      }

      return api.sendMessage(
        `[ 𝗭𝗬𝗣𝗛𝗘𝗥 𝗦𝗬𝗦𝗧𝗘𝗠 - 𝗣𝗘𝗡𝗗𝗜𝗡𝗚 ]\n╼━━━━━━━━━━━━━━━━━━━━╾\n${msg}╼━━━━━━━━━━━━━━━━━━━━╾\n${sidebar}جاوب برقم الڭروب باش تقبلو.\n${sidebar}صيفط "c" للإلغاء.`,
        threadID,
        (error, info) => {
          global.GoatBot.onReply.set(info.messageID, {
            commandName: this.config.name,
            messageID: info.messageID,
            author: event.senderID,
            pending: filteredList,
          });
        },
        messageID
      );
    } catch (error) {
      return api.sendMessage(`⚠️ فشل جلب طلبات الانتظار. جرب شوية آخر.`, threadID);
    }
  },
};

