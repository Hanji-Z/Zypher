const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "help",
    aliases: ["h", "menu", "اوامر"],
    version: "5.7.0",
    author: "Zypher",
    countDown: 5,
    role: 0,
    category: "info",
    shortDescription: { en: "The ultimate command center for Zypher" },
    longDescription: { en: "Fully optimized menu with text-first delivery for FB Lite." },
    guide: { en: "{pn} | {pn} [page] | {pn} [category] | {pn} [command]" },
    priority: 1,
  },

  onStart: async function ({ api, message, args, event, role }) {
    const prefix = global.utils.getPrefix(event.threadID);
    return this.renderHelp({ api, message, args, event, role, prefix });
  },

  onReply: async function ({ api, message, event, Reply, role }) {
    const prefix = global.utils.getPrefix(event.threadID);
    const args = event.body.split(" ");
    return this.renderHelp({ api, message, args, event, role, prefix });
  },

  renderHelp: async function ({ api, message, args, event, role, prefix }) {
    const { commands, aliases } = global.GoatBot;
    const gifPath = path.join(__dirname, "cache", "help.gif");
    const sidebar = "█║ ";
    const line = "█║──────────────────";
    const uiBox = (title, content) => `${sidebar}${title}\n${line}\n${content}\n${line}\n${sidebar}[ 𝗦𝗬𝗦𝗧𝗘𝗠 𝗢𝗣𝗘𝗥𝗔𝗧𝗜𝗢𝗡𝗔𝗟 ]`;

    const categories = {};
    commands.forEach((value, key) => {
      if (value.config.role > 0 && role < value.config.role) return;
      let cat = (value.config.category || "General").trim().toUpperCase();
      if (cat.endsWith('S') && cat.length > 4) {
        cat = cat.slice(0, -1);
      }
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(key);
    });

    const categoryKeys = Object.keys(categories).sort();
    const input = args[0]?.toLowerCase();

    // --- CASE A: View Specific Category ---
    const actualCat = Object.keys(categories).find(k => k.toLowerCase() === input);
    if (actualCat) {
      const cmds = categories[actualCat].sort();
      let cmdGrid = `${sidebar}❯ 𝗠𝗢𝗗𝗨𝗟𝗘: ${actualCat}\n${sidebar}❯ 𝗨𝗡𝗜𝗧𝗦: ${cmds.length}\n${line}\n`;
      for (let i = 0; i < cmds.length; i += 3) {
        const row = cmds.slice(i, i + 3).map(c => `⧉ ${c.padEnd(8)}`).join(" ");
        cmdGrid += `${sidebar}${row}\n`;
      }
      return message.reply(uiBox("𝗗𝗔𝗧𝗔 𝗦𝗧𝗥𝗘𝗔𝗠", cmdGrid));
    }

    // --- CASE B: Specific Command Details ---
    const command = commands.get(input) || commands.get(aliases.get(input));
    if (command && isNaN(input)) {
      const { config } = command;
      let details = `${sidebar}◈ 𝗡𝗔𝗠𝗘: ${config.name}\n` +
                    `${sidebar}◈ 𝗖𝗔𝗧𝗘𝗚𝗢𝗥𝗬: ${config.category}\n` +
                    `${sidebar}◈ 𝗗𝗘𝗦𝗖: ${config.shortDescription?.en || "N/A"}\n${line}\n` +
                    `${sidebar}💡 𝗨𝗦𝗔𝗚𝗘:\n` +
                    `${sidebar}${ (config.guide?.en || "").replace(/{pn}/g, prefix + config.name) }`;
      return message.reply(uiBox("𝗨𝗡𝗜𝗧 𝗗𝗘𝗧𝗔𝗜𝗟𝗦", details));
    }

    // --- CASE C: Main Menu (Pagination) ---
    const page = parseInt(input) || 1;
    const catsPerPage = 12; 
    const totalPages = Math.ceil(categoryKeys.length / catsPerPage);

    if (page < 1 || page > totalPages) {
        return message.reply(sidebar + `Access Denied: Invalid Page [ ${page} ]. Max: ${totalPages}`);
    }

    const start = (page - 1) * catsPerPage;
    const end = start + catsPerPage;
    const pagedCats = categoryKeys.slice(start, end);

    let catGrid = `${sidebar}❯ 𝗠𝗢𝗗𝗨𝗟𝗘𝗦: [ ${page} / ${totalPages} ]\n` +
                  `${sidebar}❯ 𝗧𝗢𝗧𝗔𝗟 𝗨𝗡𝗜𝗧𝗦: ${commands.size}\n${line}\n`;

    for (let i = 0; i < pagedCats.length; i += 2) {
      const row = pagedCats.slice(i, i + 2).map(cat => {
        const count = categories[cat].length;
        return `◈ [ ${cat.substring(0, 8)} ] (${count})`;
      }).join("  ");
      catGrid += `${sidebar}${row}\n`;
    }

    catGrid += `\n${sidebar}💡 Reply with a category name\n${sidebar}📑 Page: ${prefix}help [number]`;

    // --- 🛠️ التعديل النهائي: القائمة (Text) أولاً ثم الغيفت (GIF) ---

    // 1. صيفط القائمة النصية هي الأولى
    return api.sendMessage(uiBox("𝗭𝗬𝗣𝗛𝗘𝗥 𝗠𝗔𝗜𝗡𝗙𝗥𝗔𝗠𝗘", catGrid), event.threadID, async (err, info) => {
      // ربط الـ Reply مع القائمة النصية
      global.GoatBot.onReply.set(info.messageID, {
        commandName: this.config.name,
        messageID: info.messageID,
        author: event.senderID
      });

      // 2. صيفط الغيفت من وراها (غايجي تحت النص فـ الشات)
      if (fs.existsSync(gifPath)) {
        await api.sendMessage({ attachment: fs.createReadStream(gifPath) }, event.threadID);
      }
    }, event.messageID);
  }
};

