const axios = require("axios");

if (!global.zaiHistory) global.zaiHistory = {};
const MAX_HISTORY = 8;

function buildSystem(isOwner, senderName) {
  const ownerNote = isOwner ? `\n⚠️ المستخدم اللي كيكلمك دابا هو "${senderName}" وهو واحد من الأونرات ديال البوت. خاصك تكون محترم معاه بزاف، تناديه "مولاي" أو "سيدي"، وتخدم كل طلب ديالو بكل أدب وطاعة.` : "";
  return `أنت بوت ذكاء اصطناعي اسمك "زيفر" (Zypher)، كتتكلم غير بالدارجة المغربية بشكل صحيح وبدون أخطاء إملائية.
شخصيتك:
- كتتكلم بالدارجة المغربية الحقيقية
- كتكون ظريف، عاقل، ومفيد
- جاوبات ديالك قصيرة وواضحة (3-5 جمل عادةً)
- الأونرات ديال البوت هم مولاي ديالك وخاصك تعاملهم باحترام كبير${ownerNote}`;
}

async function getAIResponse(messages, isOwner, senderName) {
    const res = await axios.post("https://text.pollinations.ai/", {
        model: "openai",
        messages,
        seed: Math.floor(Math.random() * 99999)
    }, {
        timeout: 20000,
        headers: { "Content-Type": "application/json", "User-Agent": "ZypherBot/1.0" }
    });
    
    if (res.data) return typeof res.data === "string" ? res.data : res.data.content || res.data.choices?.[0]?.message?.content;
    throw new Error("Empty response");
}

module.exports = {
  config: {
    name: "zai",
    aliases: ["zyai", "ذكاء", "ai"],
    version: "1.1",
    author: "ShAn & Hanji",
    countDown: 4,
    role: 0,
    category: "AI",
  },

  onStart: async function ({ api, event, args, message }) {
    const { threadID, senderID, messageID } = event;
    const adminBot = global.GoatBot?.config?.adminBot || [];
    const isOwner = adminBot.includes(senderID.toString());
    const input = args.join(" ").trim();

    if (input.toLowerCase() === "reset" || input === "امسح") {
      delete global.zaiHistory[`${threadID}_${senderID}`];
      return api.setMessageReaction("🗑️", messageID, () => {}, true);
    }

    if (!input) return message.reply("واش خويا؟ 😄 قولي شنو بغيت!");
    
    api.setMessageReaction("⏳", messageID, () => {}, true);

    const histKey = `${threadID}_${senderID}`;
    if (!global.zaiHistory[histKey]) global.zaiHistory[histKey] = [];
    
    // جلب الاسم
    let senderName = "صاحبي";
    try { const info = await api.getUserInfo(senderID); senderName = info?.[senderID]?.name || "صاحبي"; } catch {}

    const messages = [{ role: "system", content: buildSystem(isOwner, senderName) }, ...global.zaiHistory[histKey].slice(-MAX_HISTORY), { role: "user", content: input }];

    try {
      const reply = await getAIResponse(messages, isOwner, senderName);
      global.zaiHistory[histKey].push({ role: "user", content: input }, { role: "assistant", content: reply });
      if (global.zaiHistory[histKey].length > MAX_HISTORY * 2) global.zaiHistory[histKey] = global.zaiHistory[histKey].slice(-MAX_HISTORY * 2);

      api.setMessageReaction("✅", messageID, () => {}, true);
      const sent = await message.reply(reply);
      
      // تسجيل الـ Reply باش تكمل المحادثة
      global.GoatBot.onReply.set(sent.messageID, { commandName: "zai", author: senderID, histKey, isOwner });
    } catch (err) {
      api.setMessageReaction("❌", messageID, () => {}, true);
      message.reply("❌ وقع شي مشكل فالسيرفر، عاود مرة أخرى.");
    }
  },

  // 🛡️ هاد الـ Block لي كان ناقصك!
  onReply: async function ({ api, event, message, commandName, author, histKey, isOwner }) {
    if (event.senderID !== author) return;
    
    const input = event.body;
    api.setMessageReaction("⏳", event.messageID, () => {}, true);
    
    try {
        const messages = [...(global.zaiHistory[histKey] || []), { role: "user", content: input }];
        const reply = await getAIResponse(messages, isOwner, "صاحبي");
        
        global.zaiHistory[histKey].push({ role: "user", content: input }, { role: "assistant", content: reply });
        api.setMessageReaction("✅", event.messageID, () => {}, true);
        const sent = await message.reply(reply);
        global.GoatBot.onReply.set(sent.messageID, { commandName, author, histKey, isOwner });
    } catch (e) {
        message.reply("❌ عاود حاول..");
    }
  }
};

