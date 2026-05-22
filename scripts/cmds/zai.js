const axios = require("axios");

if (!global.zaiHistory) global.zaiHistory = {};

const MAX_HISTORY = 8;

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

// ─── إرسال الرد والتقاط messageID بشكل موثوق ───
function sendAndRegister({ api, threadID, replyToID, text, senderID, histKey, isOwner }) {
  return new Promise((resolve) => {
    api.sendMessage(
      { body: text },
      threadID,
      (err, info) => {
        if (err || !info?.messageID) return resolve(null);
        global.GoatBot.onReply.set(info.messageID, {
          commandName: "zai",
          author: senderID,
          histKey,
          isOwner
        });
        resolve(info.messageID);
      },
      replyToID
    );
  });
}

// ─── استدعاء Pollinations API ───
async function callAI(messages, system) {
  const res = await axios.post(
    "https://text.pollinations.ai/",
    {
      model: "openai",
      messages,
      system,
      seed: Math.floor(Math.random() * 99999)
    },
    { timeout: 20000, headers: { "Content-Type": "application/json" } }
  );

  if (typeof res.data === "string")                       return res.data.trim();
  if (res.data?.choices?.[0]?.message?.content)           return res.data.choices[0].message.content.trim();
  if (res.data?.content)                                  return String(res.data.content).trim();
  throw new Error("رد فارغ");
}

// ─── حفظ المحادثة في التاريخ ───
function saveHistory(histKey, input, reply) {
  if (!global.zaiHistory[histKey]) global.zaiHistory[histKey] = [];
  global.zaiHistory[histKey].push({ role: "user",      content: input  });
  global.zaiHistory[histKey].push({ role: "assistant", content: reply  });
  if (global.zaiHistory[histKey].length > MAX_HISTORY * 2)
    global.zaiHistory[histKey] = global.zaiHistory[histKey].slice(-MAX_HISTORY * 2);
}

module.exports = {
  config: {
    name: "zai",
    aliases: ["zyai", "ذكاء", "ai"],
    version: "2.0",
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

  onStart: async function ({ api, event, args }) {
    const { threadID, senderID, messageID } = event;
    const adminBot = global.GoatBot?.config?.adminBot || [];
    const isOwner  = adminBot.includes(String(senderID));

    const input = args.join(" ").trim();

    if (input.toLowerCase() === "reset" || input === "امسح") {
      delete global.zaiHistory[`${threadID}_${senderID}`];
      return api.setMessageReaction("🗑️", messageID, () => {}, true);
    }

    if (!input)
      return api.sendMessage(
        "واش خويا؟ 😄\nقولي شنو بغيت! مثال:\n.zai شنو هو الذكاء الاصطناعي؟",
        threadID, () => {}, messageID
      );

    api.setMessageReaction("⏳", messageID, () => {}, true);

    const histKey = `${threadID}_${senderID}`;
    if (!global.zaiHistory[histKey]) global.zaiHistory[histKey] = [];

    let senderName = "صاحبي";
    try {
      const info = await api.getUserInfo(senderID);
      senderName = info?.[senderID]?.name || "صاحبي";
    } catch {}

    const messages = [
      ...global.zaiHistory[histKey].slice(-MAX_HISTORY),
      { role: "user", content: input }
    ];

    try {
      const reply = await callAI(messages, buildSystem(isOwner, senderName));
      saveHistory(histKey, input, reply);
      api.setMessageReaction("✅", messageID, () => {}, true);
      await sendAndRegister({ api, threadID, replyToID: messageID, text: reply, senderID, histKey, isOwner });
    } catch (err) {
      console.error("❌ zai onStart:", err.message);
      api.setMessageReaction("❌", messageID, () => {}, true);
      const errMsg = err.code === "ECONNABORTED" || err.message?.includes("timeout")
        ? "⏱️ ما جاوبش السيرفر، صبر شوية وعاود!"
        : "❌ وقع شي مشكل، عاود مرة أخرى خويا.";
      api.sendMessage(errMsg, threadID, () => {}, messageID);
    }
  },

  onReply: async function ({ api, event, Reply }) {
    const { threadID, senderID, body, messageID } = event;
    if (Reply.author !== String(senderID)) return;
    if (!body?.trim()) return;

    const input    = body.trim();
    const histKey  = Reply.histKey;
    const isOwner  = Reply.isOwner;

    api.setMessageReaction("⏳", messageID, () => {}, true);

    if (!global.zaiHistory[histKey]) global.zaiHistory[histKey] = [];

    let senderName = "صاحبي";
    try {
      const info = await api.getUserInfo(senderID);
      senderName = info?.[senderID]?.name || "صاحبي";
    } catch {}

    const messages = [
      ...global.zaiHistory[histKey].slice(-MAX_HISTORY),
      { role: "user", content: input }
    ];

    try {
      const reply = await callAI(messages, buildSystem(isOwner, senderName));
      saveHistory(histKey, input, reply);
      api.setMessageReaction("✅", messageID, () => {}, true);
      await sendAndRegister({ api, threadID, replyToID: messageID, text: reply, senderID, histKey, isOwner });
    } catch (err) {
      console.error("❌ zai onReply:", err.message);
      api.setMessageReaction("❌", messageID, () => {}, true);
      api.sendMessage("❌ وقع شي مشكل، عاود مرة أخرى خويا.", threadID, () => {}, messageID);
    }
  }
};
