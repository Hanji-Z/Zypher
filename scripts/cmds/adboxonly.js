module.exports = {
  config: {
    name: "onlyadminbox",
    aliases: ["admchatonly", "adboxonly", "adminboxonly"],
    version: "1.7.0",
    author: "Zypher",
    countDown: 5,
    role: 0, // رديتها 0 باش الكود يقدر يتنفذ ويشوف الـ 8ID ديالك أولاً
    category: "GROUP",
    guide: {
      en: "{pn} [on | off] | {pn} noti [on | off]"
    }
  },

  onStart: async function ({ api, args, message, event, threadsData, role }) {
    const { threadID, senderID } = event;
    const sidebar = "█║ ";
    const line = "█║──────────────────";

    // 🛡️ --- [ 𝗛𝗔𝗡𝗝𝗜 𝗜𝗠𝗠𝗨𝗡𝗜𝗧𝗬 𝗖𝗛𝗘𝗖𝗞 ] ---
    // كنقلبو واش نتا هو المطور (الـ ID ديالك فـ config.json)
    const isOwner = global.config.adminBot.includes(senderID);
    
    // إيلا ماكنتيش مطور وماكنتيش أدمن فـ لڭروب، ممنوع تخدم هاد الأمر
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

    // إيلا المطور هو اللي طفاه، كنزيدو ميساج تأكيد
    const ownerNote = isOwner ? `\n${sidebar}❯ 𝗔𝗖𝗖𝗘𝗦𝗦: Owner Bypass Active` : "";

    const response = `[ 𝗭𝗬𝗣𝗛𝗘𝗥 - 𝗖𝗢𝗡𝗙𝗜𝗚 ]\n${line}\n${sidebar}❯ 𝗦𝗧𝗔𝗧𝗨𝗦: ${status}${ownerNote}\n${line}\n${sidebar}[ 𝗢𝗣𝗘𝗥𝗔𝗧𝗜𝗢𝗡𝗔𝗟 ]`;

    return message.reply(response);
  }
};
