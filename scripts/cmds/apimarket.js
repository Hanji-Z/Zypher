const axios = require('axios');

module.exports = {
  config: {
    name: "apimarket",
    aliases: ["api", "market"],
    version: "2.1.0",
    author: "Zypher",
    countDown: 5,
    role: 2,
    category: "SYSTEM", // حطيناه فـ SYSTEM باش يتجمع المنيو
    shortDescription: { en: "Search for available APIs for developers" },
    guide: { en: "{pn} | {pn} [search query]" }
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID } = event;
    const sidebar = "█║ ";
    const line = "█║──────────────────";
    const query = args.join(" ");

    const baseUrl = "https://api-market-by-jonell-cc.hutchin.repl.co/market";

    try {
      api.setMessageReaction("🛒", messageID, () => {}, true);

      // --- Case 1: List all APIs ---
      if (!query) {
        const response = await axios.get(baseUrl);
        const list = response.data.map((item, i) => `${sidebar}${i + 1}. ${item.name}`).join("\n");
        
        let msg = `[ 𝗭𝗬𝗣𝗛𝗘𝗥 - 𝗔𝗣𝗜 𝗟𝗜𝗦𝗧 ]\n${line}\n${list}\n${line}\n${sidebar}💡 Search: .api [name]`;
        return api.sendMessage(msg, threadID, messageID);
      }

      // --- Case 2: Search for specific API ---
      const searchUrl = `${baseUrl}/?search=${encodeURIComponent(query)}`;
      const searchRes = await axios.get(searchUrl);
      const results = searchRes.data;

      if (!results || results.length === 0) {
        return api.sendMessage(sidebar + "❌ No APIs found for: " + query, threadID, messageID);
      }

      let resMsg = `[ 𝗠𝗔𝗥𝗞𝗘𝗧 𝗥𝗘𝗦𝗨𝗟𝗧𝗦 ]\n${line}\n`;
      results.forEach((res, i) => {
        resMsg += `${sidebar}❯ **Name**: ${res.name}\n` +
                  `${sidebar}❯ **Owner**: ${res.ApiOwner}\n` +
                  `${sidebar}❯ **Link**: ${res.link}\n` +
                  `${sidebar}❯ **Desc**: ${res.description}\n${line}\n`;
      });

      return api.sendMessage(resMsg, threadID, messageID);

    } catch (error) {
      console.error(error);
      return api.sendMessage(sidebar + "🚫 Market server is down.", threadID, messageID);
    }
  }
};
