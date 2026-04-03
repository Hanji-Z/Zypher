module.exports = {
  config: {
    name: "ignore",
    aliases: ["silentt", "mutebot"],
    version: "1.0.0",
    author: "Zypher",
    countDown: 2,
    role: 2, // للمطور (هانجي) فقط
    category: "OWNER",
    shortDescription: { en: "Make the bot ignore a specific user" },
    guide: { en: "{pn} (as a reply to the user)" }
  },

  onStart: async function ({ api, event, usersData, message }) {
    const { senderID, messageReply } = event;
    const sidebar = "█║ ";
    const line = "█║──────────────────";

    // 🛡️ سيكوريتي: هانجي بوحدو اللي كيقرر شكون يتجاهل
    const adminBot = global.GoatBot?.config?.adminBot || [];
    if (!adminBot.includes(senderID)) return;

    // خاصك دير ريبلاي
    if (!messageReply) {
      return message.reply(sidebar + "⚠️ Reply to the person you want to ignore.");
    }

    const targetID = messageReply.senderID;
    const targetName = await usersData.getName(targetID);

    // ممنوع تجاهل المطورين
    if (adminBot.includes(targetID)) {
      return message.reply(sidebar + "❌ Access Denied: Cannot ignore a system admin.");
    }

    try {
      // 🛠️ تبديل الـ Status فـ الداتابيز لـ true (يعني بلوكي)
      await usersData.set(targetID, {
        status: true,
        reason: "Ignored by Admin",
        date: new Date().toLocaleString()
      }, "banned");

      const response = `[ 𝗭𝗬𝗣𝗛𝗘𝗥 - 𝗜𝗚𝗡𝗢𝗥𝗘 𝗟𝗜𝗦𝗧 ]\n${line}\n` +
                       `${sidebar}❯ 𝗧𝗔𝗥𝗚𝗘𝗧: ${targetName}\n` +
                       `${sidebar}❯ 𝗨𝗜𝗗: ${targetID}\n` +
                       `${sidebar}❯ 𝗦𝗧𝗔𝗧𝗨𝗦: GHOSTED 😶‍🌫️\n${line}\n` +
                       `${sidebar}[ 𝗦𝗬𝗦𝗧𝗘𝗠 𝗪𝗜𝗟𝗟 𝗡𝗢𝗧 𝗥𝗘𝗦𝗣𝗢𝗡𝗗 ]`;

      return message.reply(response);
    } catch (e) {
      return message.reply(sidebar + "🚫 Database Error.");
    }
  }
};
