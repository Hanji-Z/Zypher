module.exports = {
  config: {
    name: "admin",
    version: "2.0.0",
    author: "Zypher",
    countDown: 5,
    role: 0,
    category: "info",
    shortDescription: { en: "Display bot controllers" },
    longDescription: { en: "View the list of authorized system administrators" },
    guide: { en: "{pn} list" }
  },

  onStart: async function ({ message, args, usersData, event }) {
    const { adminBot } = global.GoatBot.config;
    const { threadID, messageID } = event;
    
    const sidebar = "█║ ";
    const line = "█║──────────────────";
    const uiBox = (title, content) => `${sidebar}${title}\n${line}\n${content}\n${line}\n${sidebar}[ 𝗦𝗬𝗦𝗧𝗘𝗠 𝗢𝗣𝗘𝗥𝗔𝗧𝗜𝗢𝗡𝗔𝗟 ]`;

    // الـ ID ديالك أ هانجي باش نعزلوه كـ Owner
    const ownerID = "61574764452026"; 

    if (args[0] !== "list" && args[0] !== "-l") {
      return message.reply(sidebar + "Usage: .admin list to view the matrix.");
    }

    try {
      if (!adminBot || adminBot.length === 0) {
        return message.reply(sidebar + "No administrators found in the database.");
      }

      // جلب الأسماء
      const adminList = await Promise.all(
        adminBot.map(async (uid) => {
          const name = await usersData.getName(uid);
          return `${sidebar}◈ ${name} (${uid})`;
        })
      );

      // جلب اسم الـ Owner (هانجي)
      const ownerName = await usersData.getName(ownerID);

      let content = `${sidebar}❯ 𝗖𝗛𝗜𝗘𝗙 𝗢𝗣𝗘𝗥𝗔𝗧𝗢𝗥:\n` +
                    `${sidebar}◈ ${ownerName}\n` +
                    `${sidebar}◈ ID: ${ownerID}\n\n` +
                    `${sidebar}❯ 𝗦𝗬𝗦𝗧𝗘𝗠 𝗔𝗗𝗠𝗜𝗡𝗦:\n` +
                    adminList.filter(a => !a.includes(ownerID)).join("\n");

      // إيلا كان هانجي هو الوحيد، كنعلموه
      if (adminBot.length === 1 && adminBot[0] === ownerID) {
        content = `${sidebar}❯ 𝗖𝗛𝗜𝗘𝗙 𝗢𝗣𝗘𝗥𝗔𝗧𝗢𝗥:\n` +
                  `${sidebar}◈ ${ownerName}\n` +
                  `${sidebar}◈ ID: ${ownerID}\n\n` +
                  `${sidebar}❯ 𝗦𝗬𝗦𝗧𝗘𝗠 𝗔𝗗𝗠𝗜𝗡𝗦:\n` +
                  `${sidebar}No secondary admins assigned.`;
      }

      return message.reply(uiBox("𝗭𝗬𝗣𝗛𝗘𝗥 𝗔𝗗𝗠𝗜𝗡 𝗠𝗔𝗧𝗥𝗜𝗫", content));

    } catch (e) {
      console.error(e);
      return message.reply(sidebar + "Error accessing the admin database.");
    }
  }
};
