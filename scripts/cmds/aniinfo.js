const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "aniinfo",
    aliases: ["animeinfo", "a-info"],
    version: "3.5.0",
    author: "Zypher",
    countDown: 8,
    role: 0,
    category: "anime",
    shortDescription: { en: "Get anime info (Toxic mode)" },
    guide: { en: "{pn} [anime name]" }
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID } = event;
    const query = args.join(" ");
    const sidebar = "█║ ";
    const line = "█║──────────────────";

    // إشعار مستفز إيلا نسى السمية
    if (!query) return api.sendMessage(sidebar + "❗ واش باغي نبقا نتخايل السمية؟ كتب سمية الأنمي ولا تحرك.", threadID, messageID);

    try {
      api.setMessageReaction("🤨", messageID, () => {}, true);

      const res = await axios.get(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=1`);
      const anime = res.data.data[0];

      // إشعار مستفز إيلا مالقاش النتيجة
      if (!anime) return api.sendMessage(sidebar + "❌ مالقيت والو. واش هاد الأنمي حلمتي بيه البارح؟ باركة من التخربيق.", threadID, messageID);

      // ترجمة القصة (Synopsis) للعربية
      let descriptionAr = "ماكاين ما يتشاف هنا.";
      if (anime.synopsis) {
        try {
          const transRes = await axios.get(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ar&dt=t&q=${encodeURIComponent(anime.synopsis.substring(0, 1000))}`);
          descriptionAr = transRes.data[0].map(item => item[0]).join("");
        } catch (e) {
          descriptionAr = anime.synopsis;
        }
      }

      // الميساج: المعلومات عادية والداخلات مستفزة
      const msg = `[ 𝗭𝗬𝗣𝗛𝗘𝗥 - 𝗔𝗡𝗜𝗠𝗘 𝗗𝗔𝗧𝗔𝗕𝗔𝗦𝗘 ]\n` +
                  `${line}\n` +
                  `${sidebar}❯ 🎬 **العنوان**: ${anime.title_english || anime.title}\n` +
                  `${sidebar}❯ 📊 **التقييم**: ${anime.score || "?"}/10\n` +
                  `${sidebar}❯ 📺 **النوع**: ${anime.type}\n` +
                  `${sidebar}❯ 📡 **الحالة**: ${anime.status}\n` +
                  `${sidebar}❯ 🎞️ **الحلقات**: ${anime.episodes || "?"}\n` +
                  `${sidebar}❯ 🎭 **التصنيفات**: ${anime.genres.map(g => g.name).join(", ")}\n` +
                  `${line}\n` +
                  `${sidebar}❯ 📝 **هاك قرا (إيلا كنتي كتعرف تقرأ)**:\n${descriptionAr.substring(0, 500)}...\n` +
                  `${line}\n` +
                  `${sidebar}⚠️ **Note**: سير تفرج دابا ولا كترتي من التبرزيط.\n` +
                  `${sidebar}[ 𝗦𝗬𝗦𝗧𝗘𝗠 𝗢𝗣𝗘𝗥𝗔𝗧𝗜𝗢𝗡𝗔𝗟 ]`;

      const imageURL = anime.images.jpg.large_image_url;
      const imgPath = path.join(__dirname, "cache", `ani_${Date.now()}.jpg`);
      
      const imgRes = await axios.get(imageURL, { responseType: "arraybuffer" });
      await fs.outputFile(imgPath, imgRes.data);

      return api.sendMessage(
        { body: msg, attachment: fs.createReadStream(imgPath) },
        threadID,
        () => fs.unlinkSync(imgPath),
        messageID
      );

    } catch (err) {
      api.sendMessage(sidebar + "🚫 السيرفر عيا من هاد الأسئلة الحامضة. جرب من بعد.", threadID, messageID);
    }
  }
};

