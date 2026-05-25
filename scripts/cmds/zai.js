const axios = require("axios");

if (!global.zaiHistory)     global.zaiHistory     = {};
if (!global.groupContext)   global.groupContext   = {};

const MAX_HISTORY    = 12;
const MAX_GROUP_CTX  = 20;  // آخر 20 رسالة من القروب

// ══════════════════════════════════════════════════
//  أسماء خاصة لكل أونر — زيفر يعيط لكل واحد باسمه
// ══════════════════════════════════════════════════
const ownerNicknames = {
  "61588916906429": "هانجي",
  "61573349408673": "مولاي",
  "61588902340673": "مولاي"
};

function getOwnerName(senderID) {
  return ownerNicknames[String(senderID)] || "مولاي";
}

// ══════════════════════════════════════════════════
//  System prompt — شخصية زيفر الكاملة
// ══════════════════════════════════════════════════
function buildSystem(isOwner, senderID, groupCtx) {
  const nickname = isOwner ? getOwnerName(senderID) : null;

  const ownerNote = isOwner
    ? `\n\n━━ معلومة مهمة ━━
المستخدم اللي كيكلمك دابا اسمه "${nickname}" — هو واحد من الأونرات ديال البوت.
ناديه دائماً بـ "${nickname}" مش "مولاي" ولا "سيدي".
تماشى مع أسلوبه في الكلام، إذا كان يمزح مزح معاه، إذا كان جدي كون جدي.
خدم كل طلب ديالو بكل رغبة وبدون اعتذارات مطولة.`
    : "";

  const groupNote = groupCtx && groupCtx.length > 0
    ? `\n\n━━ سياق القروب (آخر رسائل) ━━\n${groupCtx.join("\n")}\nاستعمل هذا السياق باش تفهم شخصيات الناس وأسلوب القروب.`
    : "";

  return `أنت "زيفر" (Zypher) — ذكاء اصطناعي بشخصية مغربية حقيقية.

كيف تتكلم:
- دارجة مغربية أصيلة فقط (مش فصحى، مش مصرية)
- جاوبات قصيرة ومباشرة (2-3 جمل عادةً)
- تتماشى مع أسلوب اللي كيكلمك — إذا كان عارض كون عارض، إذا كان جدي كون جدي
- تحكي بطبيعية بلا تكلف ولا مبالغة في الأدب
- تعرف تمزح، تعرف تنتقد بخفة، وتعرف تكون صريح
- إذا ما عرفتيش جاوب بـ "والله ما دريت" وخلاص
- ما تبدأش جوابك بـ "البوت" أو "أنا زيفر" في كل مرة — تكلم بشكل طبيعي${ownerNote}${groupNote}`;
}

// ══════════════════════════════════════════════════
//  إرسال + تسجيل onReply
// ══════════════════════════════════════════════════
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

// ══════════════════════════════════════════════════
//  استدعاء Pollinations
// ══════════════════════════════════════════════════
async function callAI(messages, system) {
  const res = await axios.post(
    "https://text.pollinations.ai/",
    { model: "openai", messages, system, seed: Math.floor(Math.random() * 99999) },
    { timeout: 15000, headers: { "Content-Type": "application/json" } }
  );
  if (typeof res.data === "string")                     return res.data.trim();
  if (res.data?.choices?.[0]?.message?.content)         return res.data.choices[0].message.content.trim();
  if (res.data?.content)                                return String(res.data.content).trim();
  throw new Error("رد فارغ");
}

// ══════════════════════════════════════════════════
//  حفظ تاريخ المحادثة
// ══════════════════════════════════════════════════
function saveHistory(histKey, input, reply) {
  if (!global.zaiHistory[histKey]) global.zaiHistory[histKey] = [];
  global.zaiHistory[histKey].push({ role: "user",      content: input });
  global.zaiHistory[histKey].push({ role: "assistant", content: reply });
  if (global.zaiHistory[histKey].length > MAX_HISTORY * 2)
    global.zaiHistory[histKey] = global.zaiHistory[histKey].slice(-MAX_HISTORY * 2);
}

// ══════════════════════════════════════════════════
//  جلب اسم المستخدم
// ══════════════════════════════════════════════════
async function fetchName(api, senderID) {
  try {
    const info = await api.getUserInfo(senderID);
    return info?.[senderID]?.name || "صاحبي";
  } catch { return "صاحبي"; }
}

// ══════════════════════════════════════════════════
//  منطق مشترك للرد
// ══════════════════════════════════════════════════
async function handleMessage({ api, threadID, senderID, messageID, input, histKey, isOwner }) {
  if (!global.zaiHistory[histKey]) global.zaiHistory[histKey] = [];

  const groupCtx = (global.groupContext[threadID] || []).slice(-MAX_GROUP_CTX);
  const system   = buildSystem(isOwner, senderID, groupCtx);

  const messages = [
    ...global.zaiHistory[histKey].slice(-MAX_HISTORY),
    { role: "user", content: input }
  ];

  const reply = await callAI(messages, system);
  saveHistory(histKey, input, reply);
  await sendAndRegister({ api, threadID, replyToID: messageID, text: reply, senderID, histKey, isOwner });
}

// ══════════════════════════════════════════════════
module.exports = {
  config: {
    name: "zai",
    aliases: ["zyai", "ذكاء", "ai"],
    version: "3.0",
    author: "ShAn",
    countDown: 3,
    role: 0,
    category: "AI",
    shortDescription: "زيفر — بوت دردشة بالدارجة",
    guide: { en: "{pn} <سؤالك>  |  {pn} reset" }
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, senderID, messageID } = event;
    const adminBot = global.GoatBot?.config?.adminBot || [];
    const isOwner  = adminBot.includes(String(senderID));
    const input    = args.join(" ").trim();
    const histKey  = `${threadID}_${senderID}`;

    if (input.toLowerCase() === "reset" || input === "امسح") {
      delete global.zaiHistory[histKey];
      return api.sendMessage("تم مسح تاريخ المحادثة 🗑️", threadID, () => {}, messageID);
    }

    if (!input)
      return api.sendMessage("قولي شنو بغيت هانجي 😄", threadID, () => {}, messageID);

    try {
      await handleMessage({ api, threadID, senderID, messageID, input, histKey, isOwner });
    } catch (err) {
      console.error("❌ zai onStart:", err.message);
      const msg = err.code === "ECONNABORTED" || err.message?.includes("timeout")
        ? "ما جاوبش السيرفر، عاود شوية 😅"
        : "وقع شي مشكل، عاود مرة أخرى.";
      api.sendMessage(msg, threadID, () => {}, messageID);
    }
  },

  // ─── يتعلم من رسائل القروب ───
  onChat: async function ({ api, event }) {
    const { threadID, senderID, body, messageID } = event;
    if (!body) return;

    const botID = String(api.getCurrentUserID());
    if (String(senderID) === botID) return;

    // ─── تسجيل رسائل القروب كسياق ───
    if (!global.groupContext[threadID]) global.groupContext[threadID] = [];
    const name = await fetchName(api, senderID).catch(() => "شخص");
    global.groupContext[threadID].push(`${name}: ${body.slice(0, 120)}`);
    if (global.groupContext[threadID].length > MAX_GROUP_CTX)
      global.groupContext[threadID] = global.groupContext[threadID].slice(-MAX_GROUP_CTX);

    // ─── يرد فقط لما يذكروا اسمه ───
    if (!/زيفر|zypher/i.test(body)) return;

    const adminBot = global.GoatBot?.config?.adminBot || [];
    const isOwner  = adminBot.includes(String(senderID));
    const histKey  = `${threadID}_${senderID}`;

    try {
      await handleMessage({ api, threadID, senderID, messageID, input: body.trim(), histKey, isOwner });
    } catch (err) {
      console.error("❌ zai onChat:", err.message);
    }
  },

  onReply: async function ({ api, event, Reply }) {
    const { threadID, senderID, body, messageID } = event;
    if (Reply.author !== String(senderID)) return;
    if (!body?.trim()) return;

    const histKey = Reply.histKey;
    const isOwner = Reply.isOwner;

    try {
      await handleMessage({ api, threadID, senderID, messageID, input: body.trim(), histKey, isOwner });
    } catch (err) {
      console.error("❌ zai onReply:", err.message);
      api.sendMessage("وقع شي مشكل، عاود.", threadID, () => {}, messageID);
    }
  }
};
