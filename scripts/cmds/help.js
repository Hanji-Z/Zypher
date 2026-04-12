const fs = require("fs-extra");
const path = require("path");
const moment = require("moment-timezone");

module.exports = {
  config: {
    name: "help",
    aliases: ["h", "menu", "اوامر"],
    version: "6.8.0",
    author: "Zypher & Hanji",
    countDown: 5,
    role: 0,
    category: "info",
    shortDescription: { en: "Vertical help with custom category priority" },
    guide: { en: "{pn} | {pn} [page] | {pn} [command]" },
    priority: 1,
  },

  onStart: async function ({ api, message, args, event, role }) {
    const { commands, aliases } = global.GoatBot;
    const prefix = global.utils.getPrefix(event.threadID);
    const gifPath = path.join(__dirname, "cache", "help.gif");
    
    // --- [ 𝗭𝗬𝗣𝗛𝗘𝗥 𝗣𝗥𝗜𝗢𝗥𝗜𝗧𝗬 𝗠𝗔𝗣 ] ---
    // هنا رتب الأصناف كيفما بغيتيها تسبق (بالسمية اللي داير فـ الـ Config ديال الأوامر)
    const priority = ["ANIME", "images", "fun", "info", "system", "box chat"];

    const ping = Date.now() - event.timestamp;
    const uptime = process.uptime();
    const uptimeString = `${Math.floor(uptime/3600).toString().padStart(2,'0')}:${Math.floor((uptime%3600)/60).toString().padStart(2,'0')}:${Math.floor(uptime%60).toString().padStart(2,'0')}`;
    const timeNow = moment().tz("Africa/Casablanca").format("HH:mm:ss");

    const input = args[0]?.toLowerCase();

    // 1. تفاصيل أمر معين
    const command = commands.get(input) || commands.get(aliases.get(input));
    if (command && isNaN(input)) {
      const { config } = command;
      let details = `[ 𝗭𝗬𝗣𝗛𝗘𝗥 𝗨𝗡𝗜𝗧: ${config.name.toUpperCase()} ]\n` +
                    `╼━━━━━━━━━━━━━━━━━━━━╾\n` +
                    `❯ CATEGORY: ${config.category}\n` +
                    `❯ DESC: ${config.shortDescription?.en || "N/A"}\n` +
                    `╼━━━━━━━━━━━━━━━━━━━━╾\n` +
                    `💡 USAGE:\n${ (config.guide?.en || "").replace(/{pn}/g, prefix + config.name) }\n` +
                    `╼━━━━━━━━━━━━━━━━━━━━╾\n` +
                    `[ 𝗔𝗖𝗖𝗘𝗦𝗦 𝗚𝗥𝗔𝗡𝗧𝗘𝗗 - 𝗛𝗔𝗡𝗝𝗜 ]`;
      return message.reply(details);
    }

    // 2. تجميع الأوامر حسب الصنف وتطبيق الترتيب المخصص
    const categorized = {};
    commands.forEach((cmd) => {
        if (cmd.config.role > 0 && role < cmd.config.role) return;
        const cat = (cmd.config.category || "General").toLowerCase();
        if (!categorized[cat]) categorized[cat] = [];
        categorized[cat].push(cmd.config.name);
    });

    // ترتيب الأصناف حسب لستة الـ priority
    const sortedCategories = Object.keys(categorized).sort((a, b) => {
        let indexA = priority.indexOf(a);
        let indexB = priority.indexOf(b);
        if (indexA === -1) indexA = 99; // الأصناف اللي ماذكوراش تجي فـ اللخر
        if (indexB === -1) indexB = 99;
        return indexA - indexB;
    });

    // تحويلها لـ لستة واحدة مسطرة (بدون أسماء الأصناف)
    const finalOrderedCommands = [];
    sortedCategories.forEach(cat => {
        finalOrderedCommands.push(...categorized[cat].sort()); // ترتيب الأوامر وسط كل صنف أبجدياً
    });

    const page = parseInt(input) || 1;
    const cmdsPerPage = 15; 
    const totalPages = Math.ceil(finalOrderedCommands.length / cmdsPerPage);

    if (page < 1 || page > totalPages) return message.reply(`█║ Invalid Sector [ ${page} / ${totalPages} ]`);

    const start = (page - 1) * cmdsPerPage;
    const pagedCmds = finalOrderedCommands.slice(start, start + cmdsPerPage);

    // --- [ بـنـاء الـتـصـمـيـم الـעـمـودي ] ---
    let cmdList = `[ 𝗦𝗬𝗦𝗧𝗘𝗠_𝗟𝗢𝗚_𝗥𝗨𝗡𝗡𝗜𝗡𝗚 ]\n`;
    cmdList += `╼━━━━━━━━━━━━━━━━━━━━╾\n`;
    cmdList += `[#] PING ............ ${ping}ms\n`;
    cmdList += `[#] UPTIME .......... ${uptimeString}\n`;
    cmdList += `[#] TIME ............ ${timeNow}\n`;
    cmdList += `╼━━━━━━━━━━━━━━━━━━━━╾\n`;

    const maxCmdLength = 12;
    pagedCmds.forEach(cmd => {
      let dots = ".".repeat(Math.max(2, (maxCmdLength - cmd.length) + 10));
      cmdList += `[#] ${cmd} ${dots} OK\n`;
    });

    cmdList += `╼━━━━━━━━━━━━━━━━━━━━╾\n`;
    cmdList += `[ 𝗣𝗔𝗚𝗘 : ${page.toString().padStart(2, '0')} / ${totalPages.toString().padStart(2, '0')} ]\n`;
    cmdList += `[ 𝗧𝗢𝗧𝗔𝗟 : ${finalOrderedCommands.length} 𝗨𝗡𝗜𝗧𝗦 ]\n`;
    cmdList += `[ 𝗔𝗖𝗖𝗘𝗦𝗦_𝗚𝗥𝗔𝗡𝗧𝗘𝗗_𝗛𝗔𝗡𝗝𝗜 ]`;

    const tasks = [api.sendMessage(cmdList, event.threadID, event.messageID)];
    if (fs.existsSync(gifPath)) tasks.push(api.sendMessage({ attachment: fs.createReadStream(gifPath) }, event.threadID));
    return Promise.all(tasks);
  }
};
