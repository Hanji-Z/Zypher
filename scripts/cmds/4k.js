const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "4k",
    version: "1.0.5",
    author: "Hanji",
    countDown: 10,
    role: 0,
    shortDescription: "تحويل جودة الصورة إلى 4K",
    category: "image",
    guide: { en: "قم بالرد على صورة بـ .4k" }
  },

  onStart: async function ({ api, event, message }) {
    const { threadID, messageID, messageReply } = event;

    try {
      // 1. التاكد من وجود الصورة
      if (!messageReply || !messageReply.attachments || messageReply.attachments.length === 0 || messageReply.attachments[0].type !== "photo") {
        return api.sendMessage("⚠️ أ هانجي، خاصك ترد على شي تصويرة باش نخدم!", threadID, messageID);
      }

      const imageUrl = messageReply.attachments[0].url;
      api.sendMessage("⏳ يتم الآن رفع الجودة إلى 4K... انتظر قليلاً يا صديقي.", threadID, messageID);

      // 2. طلب الـ API (تأكد أن الرابط شغال)
      const upscaleApi = `https://mahbub-ullash.cyberbot.top/api/4k?imageUrl=${encodeURIComponent(imageUrl)}&size=high`;
      const res = await axios.get(upscaleApi);

      if (res.data && res.data.success && res.data.result) {
        const upscaledUrl = res.data.result;
        
        // تجهيز مسار الكاش
        const cacheDir = path.join(__dirname, "cache");
        if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);
        
        const tempPath = path.join(cacheDir, `upscale_${Date.now()}.png`);

        // 3. تحميل الصورة الناتجة
        const imageRes = await axios.get(upscaledUrl, { responseType: "stream" });
        const writer = fs.createWriteStream(tempPath);
        imageRes.data.pipe(writer);

        writer.on("finish", () => {
          api.sendMessage({
            body: "✅ تمت العملية بنجاح! إليك صورتك بجودة 4K:",
            attachment: fs.createReadStream(tempPath)
          }, threadID, () => {
            // حذف الملف من الكاش بعد الإرسال
            if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
          }, messageID);
        });

        writer.on("error", (err) => {
          console.error(err);
          api.sendMessage("❌ وقع مشكل أثناء معالجة الصورة.", threadID, messageID);
        });

      } else {
        api.sendMessage("❌ فشل الـ API في تحويل الصورة، جرب مرة أخرى لاحقاً.", threadID, messageID);
      }

    } catch (err) {
      console.error(err);
      api.sendMessage(`⚠️ خطأ في النظام: ${err.message}`, threadID, messageID);
    }
  }
};
