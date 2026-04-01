const itunes = require("searchitunes");
const { getStreamFromURL } = global.utils;

module.exports = {
  config: {
    name: "appstore",
    aliases: ["app", "ios"],
    version: "1.3.0",
    author: "Zypher",
    countDown: 5,
    role: 0,
    category: "SYSTEM", // مجموع مع أدوات البحث والسيستيم
    shortDescription: { en: "Search for iOS apps on App Store" },
    guide: { en: "{pn} [app name]" }
  },

  onStart: async function ({ message, args, api, event }) {
    const { threadID, messageID } = event;
    const sidebar = "█║ ";
    const line = "█║──────────────────";
    const keyword = args.join(" ");

    if (!keyword) return message.reply(sidebar + "⚠️ Please provide an app name to search.");

    api.setMessageReaction("🍎", messageID, () => {}, true);

    try {
      const response = await itunes({
        entity: "software",
        country: "US", // رديتها US باش يعطي نتائج عالمية كتر
        term: keyword,
        limit: 3
      });

      const results = response.results;

      if (results.length === 0) {
        return message.reply(sidebar + `❌ No results found for: ${keyword}`);
      }

      let msg = `[ 𝗔𝗣𝗣 𝗦𝗧𝗢𝗥𝗘 𝗦𝗘𝗔𝗥𝗖𝗛 ]\n${line}\n`;
      const pendingImages = [];

      for (const res of results) {
        const rating = res.averageUserRating ? "🌟".repeat(Math.round(res.averageUserRating)) : "No rating";
        
        msg += `${sidebar}❯ **${res.trackCensoredName}**\n` +
               `${sidebar}👤 Developer: ${res.artistName}\n` +
               `${sidebar}💰 Price: ${res.formattedPrice}\n` +
               `${sidebar}⭐ Rating: ${rating} (${res.averageUserRating?.toFixed(1) || 0}/5)\n` +
               `${sidebar}🔗 [Link](${res.trackViewUrl})\n${line}\n`;

        // جلب أيقونة التطبيق
        pendingImages.push(await getStreamFromURL(res.artworkUrl512 || res.artworkUrl100));
      }

      msg += `${sidebar}[ 𝗦𝗬𝗦𝗧𝗘𝗠 𝗢𝗣𝗘𝗥𝗔𝗧𝗜𝗢𝗡𝗔𝗟 ]`;

      return message.reply({
        body: msg,
        attachment: await Promise.all(pendingImages)
      });

    } catch (err) {
      console.error(err);
      return message.reply(sidebar + "🚫 Error searching the App Store.");
    }
  }
};
