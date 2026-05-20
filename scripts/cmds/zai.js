const axios = require("axios");

// ─── تاريخ المحادثات في الذاكرة ───
if (!global.zaiHistory) global.zaiHistory = {};

const MAX_HISTORY = 8; // آخر 8 رسائل في الذاكرة

// ─── System Prompt بالدارجة ───
function buildSystem(isOwner, senderName) {
  const ownerNote = isOwner
    ? `\n⚠️ المستخدم اللي كيكلمك دابا هو "${senderName}" وهو واحد من الأونرات ديال البوت. خاصك تكون محترم معاه بزاف، تناديه "مولاي" أو "سيدي"، وتخدم كل طلب ديالو بكل أدب وطاعة.`
    : "";

  return `أنت بوت ذكاء اصطناعي اسمك "زيفر" (Zypher)، كتتكلم غير بالدارجة المغربية بشكل صحيح وبدون أخطاء إملائية.

شخصيتك:
- كتتكلم بالدارجة المغربية الحقيقية (مش فصحى، مش عامية مصرية)
- كتكون ظريف، عاقل، ومفيد
- جاوبات ديالك قصيرة وواضحة (3-5 جمل عادةً)
- تعرف تمزح بخفة وتكون طبيعي في الكلام
- إلى سؤلوك على شي ما تعرفوش، كتقول "والله ما عندي فكرة، سولو شي واحد خرين 😅"
- إلى شتموك أو تكلموك بسوء، كتجاوب بهدوء وتقول "اسمحلي ما هكذا كيتكلم الناس"
- الأونرات ديال البوت هم مولاي ديالك وخاصك تعاملهم باحترام كبير${ownerNote}`;
}

module.exports = {
  config: {
    name: "zai",
    aliases: ["zyai", "ذكاء", "ai"],
    version: "1.0",
    author: "ShAn",
    countDown: 4,
    role: 0,
    category: "AI",
    shortDescription: "بوت دردشة بالدارجة المغربية",
    guide: {
      en: "{pn} <سؤالك>       — تكلم مع زيفر\n"
        + "{pn} reset          — امسح تاريخ المحادثة"
    }
  },

  onStart: async function ({ api, event, args, message }) {
    const { threadID, senderID, messageID } = event;
    const adminBot = global.GoatBot?.config?.adminBot || [];
    const isOwner = adminBot.includes(senderID.toString());

    const input = args.join(" ").trim();

    // ─── reset ───
    if (input.toLowerCase() === "reset" || input === "امسح") {
      delete global.zaiHistory[`${threadID}_${senderID}`];
      return api.setMessageReaction("🗑️", messageID, () => {}, true);
    }

    if (!input)
      return message.reply(
        "واش خويا؟ 😄\nقولي شنو بغيت! مثال:\n.zai شنو هو الذكاء الاصطناعي؟"
      );

    api.setMessageReaction("⏳", messageID, () => {}, true);

    const histKey = `${threadID}_${senderID}`;
    if (!global.zaiHistory[histKey]) global.zaiHistory[histKey] = [];

    // ─── جلب اسم المستخدم ───
    let senderName = "صاحبي";
    try {
      const info = await api.getUserInfo(senderID);
      senderName = info?.[senderID]?.name || "صاحبي";
    } catch {}

    // ─── بناء رسائل المحادثة ───
    const history = global.zaiHistory[histKey].slice(-MAX_HISTORY);
    const messages = [
      ...history,
      { role: "user", content: input }
    ];

    try {
      const res = await axios.post(
        "https://text.pollinations.ai/",
        {
          model: "openai",
          messages,
          system: buildSystem(isOwner, senderName),
          seed: Math.floor(Math.random() * 99999)
        },
        {
          timeout: 20000,
          headers: { "Content-Type": "application/json" }
        }
      );

      let reply = "";
      if (typeof res.data === "string") {
        reply = res.data.trim();
      } else if (res.data?.choices?.[0]?.message?.content) {
        reply = res.data.choices[0].message.content.trim();
      } else if (res.data?.content) {
        reply = String(res.data.content).trim();
      }

      if (!reply) throw new Error("رد فارغ");

      // ─── حفظ في التاريخ ───
      global.zaiHistory[histKey].push({ role: "user", content: input });
      global.zaiHistory[histKey].push({ role: "assistant", content: reply });
      // نبقاو فقط آخر MAX_HISTORY رسالة
      if (global.zaiHistory[histKey].length > MAX_HISTORY * 2)
        global.zaiHistory[histKey] = global.zaiHistory[histKey].slice(-MAX_HISTORY * 2);

      api.setMessageReaction("✅", messageID, () => {}, true);

      const sent = await message.reply(reply);
      const sentID = sent?.messageID || sent?.messageId;
      if (!sentID) return;

      // ─── onReply لمتابعة المحادثة ───
      global.GoatBot.onReply.set(sentID, {
        commandName: "zai",
        author: senderID,
        histKey,
        isOwner
      });

    } catch (err) {
      console.error("❌ zai error:", err.message);
      api.setMessageReaction("❌", messageID, () => {}, true);

      const errMsg = err.code === "ECONNABORTED" || err.message?.includes("timeout")
        ? "⏱️ ما جاوبش السيرفر، صبر شوية وعاود!"
        : "❌ وقع شي مشكل، عاود مرة أخرى خويا.";
      return message.reply(errMsg);
    }
  },

  onReply: async function ({ api, event, Reply, message }) {
    const { senderID, body, messageID } = event;
    if (Reply.author !== senderID) return;
    if (!body?.trim()) return;

    const adminBot = global.GoatBot?.config?.adminBot || [];
    const isOwner = adminBot.includes(senderID.toString());
    const { histKey } = Reply;

    const input = body.trim();

    api.setMessageReaction("⏳", messageID, () => {}, true);

    if (!global.zaiHistory[histKey]) global.zaiHistory[histKey] = [];
    const history = global.zaiHistory[histKey].slice(-MAX_HISTORY);

    let senderName = "صاحبي";
    try {
      const info = await api.getUserInfo(senderID);
      senderName = info?.[senderID]?.name || "صاحبي";
    } catch {}

    const messages = [
      ...history,
      { role: "user", content: input }
    ];

    try {
      const res = await axios.post(
        "https://text.pollinations.ai/",
        {
          model: "openai",
          messages,
          system: buildSystem(isOwner, senderName),
          seed: Math.floor(Math.random() * 99999)
        },
        {
          timeout: 20000,
          headers: { "Content-Type": "application/json" }
        }
      );

      let reply = "";
      if (typeof res.data === "string") {
        reply = res.data.trim();
      } else if (res.data?.choices?.[0]?.message?.content) {
        reply = res.data.choices[0].message.content.trim();
      } else if (res.data?.content) {
        reply = String(res.data.content).trim();
      }

      if (!reply) throw new Error("رد فارغ");

      global.zaiHistory[histKey].push({ role: "user", content: input });
      global.zaiHistory[histKey].push({ role: "assistant", content: reply });
      if (global.zaiHistory[histKey].length > MAX_HISTORY * 2)
        global.zaiHistory[histKey] = global.zaiHistory[histKey].slice(-MAX_HISTORY * 2);

      api.setMessageReaction("✅", messageID, () => {}, true);

      const sent = await message.reply(reply);
      const sentID = sent?.messageID || sent?.messageId;
      if (!sentID) return;

      global.GoatBot.onReply.set(sentID, {
        commandName: "zai",
        author: senderID,
        histKey,
        isOwner
      });

    } catch (err) {
      console.error("❌ zai onReply error:", err.message);
      api.setMessageReaction("❌", messageID, () => {}, true);
      return message.reply("❌ وقع شي مشكل، عاود مرة أخرى خويا.");
    }
  }
};
