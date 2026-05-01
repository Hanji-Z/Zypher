const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const { promisify } = require("util");
const stream = require("stream");
const pipeline = promisify(stream.pipeline);

// ═══════════════════════════════════════════════════
// تحميل الصورة كـ Buffer من URL
// ═══════════════════════════════════════════════════
async function downloadBuffer(url) {
  const res = await axios.get(url, {
    responseType: "arraybuffer",
    timeout: 20000,
    headers: {
      "User-Agent": "Mozilla/5.0",
      "Referer": "https://www.facebook.com/"
    }
  });
  return Buffer.from(res.data);
}

// ═══════════════════════════════════════════════════
// APIs للـ upscale — يجرب واحدة واحدة
// ═══════════════════════════════════════════════════
async function tryUpscaleAPIs(imageUrl) {
  const apis = [
    // API 1: waifu2x (أفضل لـ anime/art)
    async () => {
      const res = await axios.get(
        `https://api.waifu2x.anime4k.org/api?style=art&noise=1&scale=2&url=${encodeURIComponent(imageUrl)}`,
        { timeout: 30000, responseType: "arraybuffer" }
      );
      if (res.headers["content-type"]?.includes("image")) return Buffer.from(res.data);
      throw new Error("Not an image response");
    },
    // API 2: jigsawstack upscale (free tier)
    async () => {
      const res = await axios.post(
        "https://api.jigsawstack.com/v1/ai/image_upscale",
        { url: imageUrl, scale: 2 },
        { timeout: 30000, responseType: "arraybuffer", headers: { "Content-Type": "application/json" } }
      );
      if (res.headers["content-type"]?.includes("image")) return Buffer.from(res.data);
      throw new Error("Not an image response");
    },
  ];

  for (const apiCall of apis) {
    try {
      const buf = await apiCall();
      if (buf && buf.length > 1000) return buf;
    } catch {}
  }
  return null;
}

// ═══════════════════════════════════════════════════
// Upscale بـ jimp (محلي — بدون internet)
// ═══════════════════════════════════════════════════
async function upscaleWithJimp(imageBuffer, scale = 2) {
  const Jimp = require("jimp");
  const img = await Jimp.read(imageBuffer);
  const newW = img.bitmap.width * scale;
  const newH = img.bitmap.height * scale;
  img.resize(newW, newH, Jimp.RESIZE_BICUBIC);
  return await img.getBufferAsync(Jimp.MIME_JPEG);
}

module.exports = {
  config: {
    name: "4k",
    aliases: ["upscale", "hd"],
    version: "2.0.0",
    author: "Hanji (fixed)",
    countDown: 10,
    role: 0,
    shortDescription: "رفع جودة الصورة (4K Upscale)",
    longDescription: "رد على صورة لرفع جودتها — يجرب AI APIs أولاً، وإلا يستعمل bicubic scaling",
    category: "image",
    guide: { en: "رد على صورة بـ .4k أو .upscale أو .hd" }
  },

  onStart: async function ({ api, event, message }) {
    const { threadID, messageID, messageReply } = event;

    try {
      // 1. التحقق من وجود صورة في الرسالة المردود عليها
      const attach = messageReply?.attachments?.find(a => a.type === "photo" || a.type === "image");
      if (!messageReply || !attach) {
        return message.reply(
          "⚠️ كيفاش تستعمل:\n" +
          "  رد على صورة بـ .4k\n\n" +
          "مثال: ارسل صورة ثم رد عليها بـ .4k"
        );
      }

      const imageUrl = attach.url || attach.previewUrl;
      if (!imageUrl) return message.reply("❌ ما قدرتش نجيب رابط الصورة.");

      api.setMessageReaction("⏳", messageID, () => {}, true);

      const loadMsg = await api.sendMessage(
        "🔍 يحاول يرفع الجودة...\n⏳ انتظر قليلاً",
        threadID
      );

      const startTime = Date.now();
      let resultBuffer = null;
      let method = "";

      // 2. جرب AI APIs أولاً
      try {
        resultBuffer = await tryUpscaleAPIs(imageUrl);
        if (resultBuffer) method = "AI Upscale";
      } catch {}

      // 3. إذا فشلوا — jimp bicubic (محلي)
      if (!resultBuffer) {
        try {
          const originalBuffer = await downloadBuffer(imageUrl);
          resultBuffer = await upscaleWithJimp(originalBuffer, 2);
          method = "Bicubic ×2";
        } catch (e) {
          if (loadMsg) try { await api.unsendMessage(loadMsg.messageID); } catch {}
          api.setMessageReaction("❌", messageID, () => {}, true);
          return message.reply(`❌ فشل رفع الجودة: ${e.message?.slice(0, 100)}`);
        }
      }

      // 4. احفظ في cache وارسل
      const cacheDir = path.join(__dirname, "cache");
      await fs.ensureDir(cacheDir);
      const tempPath = path.join(cacheDir, `upscale_${Date.now()}.jpg`);
      await fs.writeFile(tempPath, resultBuffer);

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

      if (loadMsg) try { await api.unsendMessage(loadMsg.messageID); } catch {}

      await api.sendMessage(
        {
          body:
            `✅ تمت عملية رفع الجودة!\n` +
            `🔧 الطريقة: ${method}\n` +
            `⏱️ الوقت: ${elapsed}s`,
          attachment: fs.createReadStream(tempPath)
        },
        threadID,
        () => {
          try { if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath); } catch {}
        },
        messageID
      );

      api.setMessageReaction("✅", messageID, () => {}, true);

    } catch (err) {
      console.error("4k Error:", err);
      api.setMessageReaction("❌", messageID, () => {}, true);
      message.reply(`❌ خطأ: ${err.message?.slice(0, 150)}`);
    }
  }
};
