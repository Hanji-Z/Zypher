const axios = require("axios");
const fs    = require("fs-extra");
const path  = require("path");

if (!global.pinCache) global.pinCache = {};

const PAGE_SIZE  = 6;   // صور في كل دفعة
const POOL_SIZE  = 50;  // نجيبهم مرة وحدة ونوزعهم
const CACHE_TTL  = 30 * 60 * 1000; // 30 دقيقة

// ─── مصادر API ───────────────────────────────────────────
const SOURCES = [
  {
    name: "markdevs",
    fetch: async (q, n) => {
      const r = await axios.get(
        `https://markdevs-last-api.onrender.com/api/pinterest?search=${encodeURIComponent(q)}&count=${n}`,
        { timeout: 15000 }
      );
      const imgs = r.data?.data;
      if (!Array.isArray(imgs) || !imgs.length) throw new Error("no results");
      return imgs.filter(i => typeof i === "string");
    }
  },
  {
    name: "siputzx",
    fetch: async (q, n) => {
      const r = await axios.get(
        `https://api.siputzx.my.id/api/s/pinterest?query=${encodeURIComponent(q)}`,
        { timeout: 15000 }
      );
      const data = r.data?.data;
      if (!Array.isArray(data) || !data.length) throw new Error("no results");
      return data.map(i => i.image_url || i.img || i.url).filter(Boolean).slice(0, n);
    }
  },
  {
    name: "vyturex",
    fetch: async (q, n) => {
      const trans = await axios.get(
        `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(q)}`,
        { timeout: 8000 }
      );
      const enQ = trans.data?.[0]?.[0]?.[0] || q;
      const r = await axios.get(
        `https://api.vyturex.com/pinterest?query=${encodeURIComponent(enQ)}`,
        { timeout: 15000 }
      );
      if (!Array.isArray(r.data) || !r.data.length) throw new Error("no results");
      return r.data.slice(0, n);
    }
  }
];

async function fetchPool(query) {
  const errors = [];
  for (const src of SOURCES) {
    try {
      const imgs = await src.fetch(query, POOL_SIZE);
      if (imgs?.length) return { urls: imgs, source: src.name };
    } catch (e) {
      errors.push(`${src.name}: ${e.message}`);
    }
  }
  throw new Error(errors.join(" | "));
}

async function downloadBatch(urls) {
  const attachments = [];
  const cacheDir = path.join(__dirname, "cache");
  fs.ensureDirSync(cacheDir);

  for (let i = 0; i < urls.length; i++) {
    try {
      const filePath = path.join(cacheDir, `pin_${Date.now()}_${i}.jpg`);
      const res = await axios.get(urls[i], {
        responseType: "arraybuffer",
        timeout: 12000,
        headers: { "User-Agent": "Mozilla/5.0", "Referer": "https://www.pinterest.com/" }
      });
      fs.outputFileSync(filePath, Buffer.from(res.data));
      attachments.push({ stream: fs.createReadStream(filePath), path: filePath });
    } catch {}
  }
  return attachments;
}

// ─── إرسال دفعة صور ──────────────────────────────────────
async function sendBatch(api, message, event, cacheKey, pageLabel) {
  const entry  = global.pinCache[cacheKey];
  if (!entry) return message.reply("❌ انتهت الجلسة، ابدأ بحث جديد.");

  const { urls, query, page, source } = entry;
  const start = page * PAGE_SIZE;
  const slice = urls.slice(start, start + PAGE_SIZE);

  if (!slice.length) {
    delete global.pinCache[cacheKey];
    return message.reply(`🔚 خلاص عندي ${urls.length} صورة فقط لـ "${query}".`);
  }

  const batch = await downloadBatch(slice);
  if (!batch.length) return message.reply("❌ ما قدرت تتحمل الصور، عاود.");

  const remaining = urls.length - (start + slice.length);
  const footer    = remaining > 0 ? `\n↩️ رد بـ "التالي" لـ ${Math.min(remaining, PAGE_SIZE)} صورة أخرى` : "\n✅ هذي آخر الصور";

  const sent = await message.reply({
    body: `🖼️ ${query} — ${pageLabel} (${slice.length} صورة)${footer}`,
    attachment: batch.map(b => b.stream)
  });

  // نمسح الملفات المؤقتة
  setTimeout(() => batch.forEach(b => { try { fs.unlinkSync(b.path); } catch {} }), 5000);

  // نحدّث الصفحة في الكاش
  global.pinCache[cacheKey].page += 1;

  // نسجّل onReply إذا في المزيد
  const sentID = sent?.messageID || sent?.messageId;
  if (remaining > 0 && sentID) {
    global.GoatBot.onReply.set(sentID, {
      commandName: "pinterest",
      author: event.senderID,
      cacheKey
    });
  } else if (remaining <= 0) {
    delete global.pinCache[cacheKey];
  }
}

// ═══════════════════════════════════════════════════════
module.exports = {
  config: {
    name: "pinterest",
    aliases: ["pin", "pins", "بنتريست"],
    version: "5.0",
    author: "Hanji & ShAn",
    countDown: 5,
    role: 0,
    category: "image",
    shortDescription: { en: "Pinterest image search" },
    guide: { en: "{pn} <كلمة بحث> [عدد]\nمثال: {pn} hanji 10" }
  },

  onStart: async function ({ api, event, args, message }) {
    const { messageID, senderID } = event;

    if (!args.length) return message.reply(
      "🖼️ مثال:\n.pin hanji 6\n.pin cats 10\n\nبعد البحث رد بـ \"التالي\" لصور جديدة"
    );

    // ─── استخراج العدد من args ───
    let query = args.join(" ");
    let userLimit = PAGE_SIZE;
    const last = parseInt(args[args.length - 1]);
    if (!isNaN(last) && args.length > 1) {
      userLimit = Math.min(Math.max(last, 1), 50);
      query = args.slice(0, -1).join(" ");
    }

    api.setMessageReaction("⏳", messageID, () => {}, true);

    try {
      const { urls, source } = await fetchPool(query);

      if (!urls.length) {
        api.setMessageReaction("❌", messageID, () => {}, true);
        return message.reply(`❌ ما لقيت صور لـ "${query}".`);
      }

      // نخزن في الكاش
      const cacheKey = `${senderID}_${Date.now()}`;
      global.pinCache[cacheKey] = { urls, query, source, page: 0 };

      // نمسح الكاش بعد TTL
      setTimeout(() => delete global.pinCache[cacheKey], CACHE_TTL);

      api.setMessageReaction("✅", messageID, () => {}, true);
      await sendBatch(api, message, event, cacheKey, "الجزء 1");

    } catch (err) {
      api.setMessageReaction("❌", messageID, () => {}, true);
      console.error("Pinterest:", err.message);
      return message.reply(`❌ مشكل في البحث. جرب مرة أخرى.`);
    }
  },

  onReply: async function ({ api, event, Reply, message }) {
    const { senderID, body, messageID } = event;
    if (Reply.author !== senderID) return;

    const input = body?.trim().toLowerCase();
    if (!["التالي", "next", "المزيد", "more", "تالي"].includes(input)) return;

    const { cacheKey } = Reply;
    const entry = global.pinCache[cacheKey];
    if (!entry) return message.reply("❌ انتهت الجلسة، ابدأ بحث جديد.");

    api.setMessageReaction("⏳", messageID, () => {}, true);

    const pageNum = entry.page + 1;
    await sendBatch(api, message, event, cacheKey, `الجزء ${pageNum}`);

    api.setMessageReaction("✅", messageID, () => {}, true);
  }
};
