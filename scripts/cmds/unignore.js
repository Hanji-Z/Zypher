module.exports = {
  config: {
    name: "unignore",
    aliases: ["unghost"],
    version: "1.0.0",
    author: "Zypher",
    countDown: 2,
    role: 2,
    category: "OWNER"
  },

  onStart: async function ({ api, event, usersData, message }) {
    const { senderID, messageReply } = event;
    const sidebar = "█║ ";
    const adminBot = global.GoatBot?.config?.adminBot || [];

    if (!adminBot.includes(senderID)) return;

    if (!messageReply) return message.reply(sidebar + "⚠️ Reply to the person you want to unignore.");

    const targetID = messageReply.senderID;
    const targetName = await usersData.getName(targetID);

    try {
      // رد الـ Status لـ false (يعني خليه يجاوب)
      await usersData.set(targetID, { status: false, reason: "", date: "" }, "banned");
      
      return message.reply(`[ 𝗭𝗬𝗣𝗛𝗘𝗥 - 𝗪𝗛𝗜𝗧𝗘𝗟𝗜𝗦𝗧 ]\n█║──────────────────\n${sidebar}❯ 𝗧𝗔𝗥𝗚𝗘𝗧: ${targetName}\n${sidebar}❯ 𝗦𝗧𝗔𝗧𝗨𝗦: RESTORED ✅\n█║──────────────────`);
    } catch (e) {
      return message.reply(sidebar + "🚫 Error updating database.");
    }
  }
};

