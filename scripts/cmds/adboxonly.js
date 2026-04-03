module.exports = {
  config: {
    name: "onlyadminbox",
    aliases: ["admchatonly", "adboxonly", "adminboxonly"],
    version: "1.6.0",
    author: "Zypher",
    countDown: 5,
    role: 2,
    category: "GROUP",
    guide: {
      en: "{pn} [on | off] | {pn} noti7 [on | off]"
    }
  },

  onStart: async function ({ args, message, event, threadsData }) {
    const { threadID } = event;
    const sidebar = "█║ ";
    const line = "█║──────────────────";

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

    // ميساجات قصيرة بلونغلي
    const status = isSetNoti 
      ? (value ? "ALERTS: ON" : "ALERTS: OFF") 
      : (value ? "ADMINS ONLY: ON" : "ADMINS ONLY: OFF");

    const response = `[ 𝗭𝗬𝗣𝗛𝗘𝗥 - 𝗖𝗢𝗡𝗙𝗜𝗚 ]\n${line}\n${sidebar}❯ 𝗦𝗧𝗔𝗧𝗨𝗦: ${status}\n${line}\n${sidebar}[ 𝗢𝗣𝗘𝗥𝗔𝗧𝗜𝗢𝗡𝗔𝗟 ]`;

    return message.reply(response);
  }
};
