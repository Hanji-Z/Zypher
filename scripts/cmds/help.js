const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "help",
    aliases: ["h", "اوامر"],
    version: "4.5.0",
    author: "Zypher",
    countDown: 5,
    role: 0,
    category: "info",
    shortDescription: { en: "Advanced interactive command center" },
    longDescription: { en: "Mainframe style help with category modules and reply support" },
    guide: { en: "{pn} | {pn} [category] | {pn} [command]" },
    priority: 1,
  },

  onStart: async function ({ api, message, args, event, role }) {
    const { threadID, messageID } = event;
    const prefix = global.utils.getPrefix(threadID);
    
    return this.renderHelp({ api, message, args, event, role, prefix });
  },

  onReply: async function ({ api, message, event, Reply, role }) {
    const { threadID, messageID, body } = event;
    const prefix = global.utils.getPrefix(threadID);
    
    // إيلا جاوب بنادم على الميساج، كنعتبرو الرد هو الـ "args"
    const args = body.split(" ");
    return this.renderHelp({ api, message, args, event, role, prefix });
  },

  renderHelp: async function ({ api, message, args, event, role, prefix }) {
    const { threadID, messageID } = event;
    const { commands, aliases } = global.GoatBot;
    const gifPath = path.join(__dirname, "cache", "help.gif");
    
    const sidebar = "█║ ";
    const line = "█║──────────────────";
    const uiBox = (title, content) => `${sidebar}${title}\n${line}\n${content}\n${line}\n${sidebar}[ 𝗦𝗬𝗦𝗧𝗘𝗠 𝗢𝗣𝗘𝗥𝗔𝗧𝗜𝗢𝗡𝗔𝗟 ]`;

    // 1. تجميع الأوامر
    const categories = {};
    commands.forEach((value, key) => {
      if (value.config.role > 0 && role < value.config.role) return;
      const cat = value.config.category || "General";
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(key);
    });

    const input = args[0]?.toLowerCase();

    // --- CASE A: Landing Page (Categories List) ---
    if (!input) {
      let catList = `${sidebar}❯ 𝗠𝗢𝗗𝗨𝗟𝗘𝗦: ${Object.keys(categories).length} Operational\n` +
                    `${sidebar}❯ 𝗨𝗡𝗜𝗧𝗦: ${commands.size} Active\n${line}\n`;

      Object.keys(categories).sort().forEach(cat => {
        catList += `${sidebar}◈ [ ${cat.toUpperCase()} ]\n`;
      });

      catList += `\n${sidebar}💡 𝗥𝗲𝗽𝗹𝘆 with a category name\n` +
                 `${sidebar}📑 Type: ${prefix}help [command]`;

      const sendData = { body: uiBox("𝗭𝗬𝗣𝗛𝗘𝗥 𝗠𝗔𝗜𝗡𝗙𝗥𝗔𝗠𝗘", catList) };
      if (fs.existsSync(gifPath)) sendData.attachment = fs.createReadStream(gifPath);

      return message.reply(sendData, (err, info) => {
        // تسجيل الـ Reply باش البوت يعرف يجاوب عليه
        global.GoatBot.onReply.set(info.messageID, {
          commandName: this.config.name,
          messageID: info.messageID,
          author: event.senderID
        });
      });
    }

    // --- CASE B: View Specific Category ---
    const actualCat = Object.keys(categories).find(k => k.toLowerCase() === input);
    if (actualCat) {
      const cmds = categories[actualCat].sort();
      let cmdGrid = `${sidebar}❯ 𝗠𝗢𝗗𝗨𝗟𝗘: ${actualCat.toUpperCase()}\n${line}\n`;
      
      for (let i = 0; i < cmds.length; i += 3) {
        const row = cmds.slice(i, i + 3).map(c => `⧉ ${c.padEnd(8)}`).join(" ");
        cmdGrid += `${sidebar}${row}\n`;
      }
      
      return message.reply(uiBox("𝗗𝗔𝗧𝗔 𝗦𝗧𝗥𝗘𝗔𝗠", cmdGrid));
    }

    // --- CASE C: Command Details ---
    const command = commands.get(input) || commands.get(aliases.get(input));
    if (command) {
      const { config } = command;
      let details = `${sidebar}◈ 𝗡𝗔𝗠𝗘: ${config.name}\n` +
                    `${sidebar}◈ 𝗖𝗔𝗧𝗘𝗚𝗢𝗥𝗬: ${config.category || "General"}\n` +
                    `${sidebar}◈ 𝗗𝗘𝗦𝗖: ${config.shortDescription?.en || "N/A"}\n` +
                    line + "\n" +
                    `${sidebar}💡 𝗨𝗦𝗔𝗚𝗘:\n` +
                    `${sidebar}${ (config.guide?.en || "").replace(/{pn}/g, prefix + config.name) }`;
      
      return message.reply(uiBox("𝗨𝗡𝗜𝗧 𝗗𝗘𝗧𝗔𝗜𝗟𝗦", details));
    }

    return message.reply(sidebar + `Access Denied: "${input}" not recognized.`);
  }
};
