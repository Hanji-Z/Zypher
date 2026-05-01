const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

// سلسلة APIs — كنجرب واحد واحد، لطاح وحد يكمل الاخر
async function upscaleImage(imageUrl) {
  const enc = encodeURIComponent(imageUrl);
  const cacheDir = path.join(__dirname, "cache");
  fs.ensureDirSync(cacheDir);
  const outPath = path.join(cacheDir, `4k_${Date.now()}.png`);

  const apis = [
    // 1) mahbub API (الأصلي — لكان رجع يخدم)
    {
      name: "mahbub",
      fetch: () => axios.get(
        `https://mahbub-ullash.cyberbot.top/api/4k?imageUrl=${enc}&size=high`,
        { timeout: 15000 }
      ).then(r => {
        if (!r.data?.success || !r.data?.result) throw new Error("no result");
        return axios.get(r.data.result, { responseType: "arraybuffer", timeout: 15000 });
      })
    },

    // 2) betadash (لكان رجع يخدم)
    {
      name: "betadash",
      fetch: () => axios.get(
        `https://betadash-api-swordslush-production.up.railway.app/upscale?url=${enc}`,
        { timeout: 15000 }
      ).then(r => {
        const url = r.data?.result || r.data?.url || r.data?.image;
        if (!url) throw new Error("no result");
        return axios.get(url, { responseType: "arraybuffer", timeout: 15000 });
      })
    },

    // 3) waifu2x (خدام لبعض الصور)
    {
      name: "waifu2x",
      fetch: () => axios.get(
        `https://waifu2x.udp.jp/api?style=photo&noise=2&scale=2&url=${enc}`,
        { responseType: "arraybuffer", timeout: 25000 }
      ).then(r => {
        if (!r.headers["content-type"]?.includes("image")) throw new Error("not image");
        return r;
      })
    },

    // 4) images.weserv.nl — دايماً خدام (bicubic 4K + sharpen)
    {
      name: "weserv",
      fetch: () => axios.get(
        `https://images.weserv.nl/?url=${enc}&w=3840&h=2160&fit=inside&sharp=5&q=100&output=png`,
        { responseType: "arraybuffer", timeout: 20000 }
      ).then(r => {
        if (!r.headers["content-type"]?.includes("image")) throw new Error("not image");
        return r;
      })
    }
  ];

  for (const api of apis) {
    try {
      const res = await api.fetch();
      const buffer = Buffer.from(res.data);
      if (buffer.length < 1000) throw new Error("buffer too small");
      fs.writeFileSync(outPath, buffer);
      return { path: outPath, api: api.name };
    } catch (e) {
      console.log(`[4k] ${api.name} failed: ${e.message}`);
    }
  }

  throw new Error("كل الـ APIs فشلت");
}

module.exports = {
  config: {
    name: "4k",
    version: "2.0.0",
    author: "Hanji",
    countDown: 15,
    role: 0,
    shortDescription: "تحسين جودة الصورة ورفع دقتها",
    category: "image",
    guide: { en: "رد على صورة بـ .4k" }
  },

  onStart: async function ({ api, event }) {
    const { threadID, messageID, messageReply } = event;

    if (
      !messageReply ||
      !messageReply.attachments ||
      messageReply.attachments.length === 0 ||
      messageReply.attachments[0].type !== "photo"
    ) {
      return api.sendMessage("⚠️ خاصك ترد على تصويرة باش يخدم الأمر!", threadID, messageID);
    }

    const imageUrl = messageReply.attachments[0].url;
    api.setMessageReaction("⏳", messageID, () => {}, true);

    try {
      const { path: outPath, api: usedApi } = await upscaleImage(imageUrl);

      const sizeMB = (fs.statSync(outPath).size / (1024 * 1024)).toFixed(2);
      api.setMessageReaction("✅", messageID, () => {}, true);

      await api.sendMessage(
        {
          body: `✅ الصورة جاهزة بجودة عالية!\n📦 الحجم: ${sizeMB} MB`,
          attachment: fs.createReadStream(outPath)
        },
        threadID,
        () => { try { fs.unlinkSync(outPath); } catch {} },
        messageID
      );

    } catch (err) {
      console.error("[4k Error]", err);
      api.setMessageReaction("❌", messageID, () => {}, true);
      api.sendMessage("❌ وقع مشكل في تحسين الصورة، عاود المحاولة.", threadID, messageID);
    }
  }
};
