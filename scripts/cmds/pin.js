const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports.config = {
  name: "بنتريست",
  version: "1.2.0",
  role: 0,
  author: "Hanji",
  description: "Search Pinterest",
  category: "search",
  cooldowns: 5
};

module.exports.onStart = async ({ event, api, args, message }) => {
  const { threadID, messageID } = event;
  const query = args.join(" ");
  if (!query) return message.reply("⚠️ اكـتـب كـلـمـة الـبـحث!");

  try {
    // ترجمة سريعة
    const trans = await axios.get(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(query)}`);
    const enQuery = trans.data[0][0][0];

    // جلب الصور
    const res = await axios.get(`https://api.vyturex.com/pinterest?query=${encodeURIComponent(enQuery)}`);
    const images = res.data.slice(0, 6);

    const attachments = [];
    for (let i = 0; i < images.length; i++) {
      const imgPath = path.join(__dirname, "cache", `pin_${Date.now()}_${i}.jpg`);
      const imgRes = await axios.get(images[i], { responseType: "arraybuffer" });
      fs.outputFileSync(imgPath, Buffer.from(imgRes.data));
      attachments.push(fs.createReadStream(imgPath));
    }

    return message.reply({
      body: `📸 نـتـائـج: ${query}`,
      attachment: attachments
    }, () => attachments.forEach(f => fs.unlinkSync(f.path)));

  } catch (e) {
    return message.reply("❌ خـطأ فـي الـجـلـب.");
  }
};

