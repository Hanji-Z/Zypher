const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

// ═══════════════════════════════════════════════════
// قائمة الـ APIs — إذا فشل واحد يمشي للتالي أوتو
// ═══════════════════════════════════════════════════
const SOURCES = [
  {
    name: "markdevs",
    fetch: async (query, count) => {
      const res = await axios.get(
        `https://markdevs-last-api.onrender.com/api/pinterest?search=${encodeURIComponent(query)}&count=${count}`,
        { timeout: 15000 }
      );
      const imgs = res.data?.data;
      if (!Array.isArray(imgs) || !imgs.length) throw new Error("No results");
      return imgs.filter(i => typeof i === "string");
    }
  },
  {
    name: "siputzx",
    fetch: async (query, count) => {
      const res = await axios.get(
        `https://api.siputzx.my.id/api/s/pinterest?query=${encodeURIComponent(query)}`,
        { timeout: 15000 }
      );
      const data = res.data?.data;
      if (!Array.isArray(data) || !data.length) throw new Error("No results");
      return data
        .map(i => i.image_url || i.img || i.url)
        .filter(Boolean)
        .slice(0, count);
    }
  },
  {
    name: "pinterest-direct",
    fetch: async (query, count) => {
      // Scrape Pinterest search page مباشرة
      const res = await axios.get(
        `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(query)}`,
        {
          timeout: 15000,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
          }
        }
      );
      // استخراج روابط الصور من الـ HTML
      const html = res.data;
      const matches = [...html.matchAll(/"orig"\s*:\s*\{[^}]*"url"\s*:\s*"(https:\/\/i\.pinimg\.com\/originals\/[^"]+)"/g)];
      if (!matches.length) throw new Error("No images found in HTML");
      const urls = [...new Set(matches.map(m => m[1]))].slice(0, count);
      if (!urls.length) throw new Error("No images extracted");
      return urls;
    }
  }
];

// ═══════════════════════════════════════════════════
// دالة تجرب API واحدة تلو الأخرى
// ═══════════════════════════════════════════════════
async function fetchImages(query, count) {
  const errors = [];
  for (const source of SOURCES) {
    try {
      const images = await source.fetch(query, count);
      if (images && images.length > 0) {
        return { images: images.slice(0, count), source: source.name };
      }
    } catch (e) {
      errors.push(`${source.name}: ${e.message}`);
    }
  }
  throw new Error(`كل الـ APIs فشلوا:\n${errors.join("\n")}`);
}

// ═══════════════════════════════════════════════════
// تحويل URL لـ stream
// ═══════════════════════════════════════════════════
async function urlToStream(url) {
  const res = await axios.get(url, {
    responseType: "stream",
    timeout: 15000,
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible)",
      "Referer": "https://www.pinterest.com/"
    }
  });
  return res.data;
}

module.exports = {
  config: {
    name: "pinterest",
    aliases: ["pin", "pins"],
    version: "4.0.0",
    author: "Hanji (multi-API fallback)",
    countDown: 5,
    role: 0,
    category: "image",
    shortDescription: { en: "Pinterest image search (multi-API fallback)" },
    longDescription: { en: "Search Pinterest and receive images. Tries multiple APIs automatically if one fails." },
    guide: { en: "{pn} <keyword> [amount]\nExample: {pn} naruto 5" }
  },

  onStart: async function ({ api, event, args, message }) {
    const { threadID, messageID } = event;

    if (!args.length) {
      return message.reply(
        "🖼️ كيفاش تستعمل:\n" +
        "  • pinterest <كلمة بحث>\n" +
        "  • pinterest <كلمة بحث> <عدد>\n\n" +
        "مثال:\n" +
        "  • pinterest naruto 5\n" +
        "  • pin cats 10"
      );
    }

    // استخراج العدد من آخر argument
    let limit = 1;
    let query = args.join(" ");
    const last = parseInt(args[args.length - 1]);
    if (!isNaN(last) && args.length > 1) {
      limit = Math.min(Math.max(last, 1), 50);
      query = args.slice(0, -1).join(" ");
    }

    api.setMessageReaction("⏳", messageID, () => {}, true);
    const startTime = Date.now();

    // رسالة التحميل
    let loadMsg;
    try {
      loadMsg = await api.sendMessage(
        `🔎 يقلب على: "${query}"\n📦 العدد: ${limit}\n⏳ يحمل...`,
        threadID
      );
    } catch {}

    try {
      // 1) جيب الصور (مع fallback أوتو)
      const { images, source } = await fetchImages(query, limit);

      // 2) حمّل كل صورة كـ stream
      const attachments = [];
      let failed = 0;
      for (const url of images) {
        try {
          attachments.push(await urlToStream(url));
        } catch {
          failed++;
        }
      }

      if (!attachments.length) {
        if (loadMsg) try { await api.unsendMessage(loadMsg.messageID); } catch {}
        api.setMessageReaction("❌", messageID, () => {}, true);
        return message.reply(`❌ ما قدرتش نحمل الصور لـ "${query}". جرب مرة أخرى.`);
      }

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

      // 3) احذف رسالة التحميل
      if (loadMsg) try { await api.unsendMessage(loadMsg.messageID); } catch {}

      // 4) ارسل الصور
      api.setMessageReaction("✅", messageID, () => {}, true);
      await api.sendMessage(
        {
          body:
            `🖼️ Pinterest — "${query}"\n` +
            `📦 ${attachments.length}/${limit} صورة\n` +
            `⏱️ ${elapsed}s | 🔌 ${source}` +
            (failed > 0 ? `\n⚠️ ${failed} صورة ما تحملاتش` : ""),
          attachment: attachments
        },
        threadID,
        null,
        messageID
      );

    } catch (err) {
      if (loadMsg) try { await api.unsendMessage(loadMsg.messageID); } catch {}
      api.setMessageReaction("❌", messageID, () => {}, true);
      console.error("Pinterest Error:", err.message);
      return message.reply(
        `❌ مشكل في البحث على "${query}":\n${err.message?.slice(0, 200)}\n\n💡 جرب كلمة أخرى.`
      );
    }
  }
};

