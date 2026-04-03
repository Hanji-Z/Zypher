module.exports = {
  config: {
    name: "onlyadminbox",
    aliases: ["admchatonly", "adboxonly", "adminboxonly"],
    version: "1.7.1",
    author: "Zypher",
    countDown: 5,
    role: 0, 
    category: "GROUP",
    guide: {
      en: "{pn} [on | off] | {pn} noti [on | off]"
    }
  },

  onStart: async function ({ api, args, message, event, threadsData, role }) {
    const { threadID, senderID } = event;
    const sidebar = "█║ ";
    const line = "█║──────────────────";

    // 🛡️ --- [ الـتـصـحـيـح هـنـا ] --- 🛡️
    // استعملنا المسار الكامل ديال GoatBot باش مايطلعش الإيرور
    const adminBot = global.GoatBot?.config?.adminBot || [];
    const isOwner = adminBot.includes(senderID);
    
    if (!isOwner && role < 2) {
      return message.reply(sidebar + "🚫 Error: This command is for Group Admins or the Bot Owner only!");
    }

    let isSetNoti = false;
    let value;
    let keySetData = "data.onlyAdminBox";
    let indexGetVal = 0;

    if (args[0] == "noti") {
      isSetNoti = true;
      indexGetVal = 1;
      keySetData = "data.hideNotiMessageOnlyAdminBox";
    }

    if (args[indexGetVal] == "on") value = true;
    else if (args[indexGetVal] == "off") value = false;
    else return message.reply(sidebar + "⚠️ Syntax: [on | off]");

    await threadsData.set(threadID, isSetNoti ? !value : value, keySetData);

    const status = isSetNoti 
      ? (value ? "ALERTS: ON" : "ALERTS: OFF") 
      : (value ? "ADMINS ONLY: ON" : "ADMINS ONLY: OFF");

    const ownerNote = isOwner ? `\n${sidebar}❯ 𝗔𝗖𝗖𝗘𝗦𝗦: Owner Bypass Active` : "";

    const response = `[ 𝗭𝗬𝗣𝗛𝗘𝗥 - 𝗖𝗢𝗡𝗙𝗜𝗚 ]\n${line}\n${sidebar}❯ 𝗦𝗧𝗔𝗧𝗨𝗦: ${status}${ownerNote}\n${line}\n${sidebar}[ 𝗢𝗣𝗘𝗥𝗔𝗧𝗜𝗢𝗡𝗔𝗟 ]`;

    return message.reply(response);
  }
};
