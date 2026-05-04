const axios = require("axios");

if (!global.zipher_context) global.zipher_context = new Map();
if (!global.groupMessages) global.groupMessages = new Map();

module.exports = {
  config: {
    name: "ai",
    aliases: ["chat"],
    version: "10.0.0",
    author: "xossama2001",
    countDown: 2,
    role: 0,
    description: { en: "Smart AI Zipher" },
    category: "AI",
    guide: { en: "Just tag or reply to Zipher!" }
  },

  onChat: async function ({ event, api, message, usersData }) {
    const { threadID, body, senderID, type, messageReply } = event;
    const botID = api.getCurrentUserID();
    const config = global.GoatBot.config;
    const ownerList = config.owner || [];
    const apiKey = "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";

    if (senderID === botID || !body) return;

    // 🔍 شروط التفعيل: اسمه في الرسالة أو reply عليه
    const isMentioned = body.toLowerCase().includes("زيفر") || 
                       body.includes("زيفࢪ") || 
                       body.includes("زيفرو");
    const isReply = type === "message_reply" && messageReply?.senderID === botID;

    if (!isMentioned && !isReply) {
      // 🧠 تخزين الرسائل من القروب لل��علم
      if (!global.groupMessages.has(threadID)) {
        global.groupMessages.set(threadID, []);
      }
      const groupMsgs = global.groupMessages.get(threadID);
      groupMsgs.push({ user: senderID, msg: body });
      if (groupMsgs.length > 50) groupMsgs.shift();
      return;
    }

    try {
      const userName = await usersData.getName(senderID);
      const isOwner = ownerList.includes(senderID);
      let userHistory = global.zipher_context.get(senderID) || [];
      
      // 📚 جلب رسائل من السياق المجموعة
      const groupContext = global.groupMessages.get(threadID) || [];
      const recentGroupMsgs = groupContext.slice(-10).map(m => m.msg).join(" | ");

      // 🧠 التوجيه: مستفز مع الأعضاء، محترم مع الأونرات
      const personality = isOwner ? 
        "أنت زيفࢪ، ذكي وأنيق وكادي على احترام الأونرات تع لبوت. جاوب بسرعة وثقة." :
        "أنت زيفࢪ، ذكي ومستفز شويا مع الأعضاء، مجرد دابا تحتاج تعطيهم درس! 😏 كن ولاد وماشي ديموقراطي.";

      const systemPrompt = {
        role: "system",
        content: `أنت زيفࢪ (Zipher)، مساعد ذكي.
${personality}
- اللغة: اللهجة المغربية الفصيحة مع تأثيرات دارجة - طبيعية وبسيطة
- المستخدم الحالي: ${userName} ${isOwner ? '(أونر 👑)' : ''}
- استخدم أموجيات تليق بـ رسالتك (😏 🔥 💀 👍 وغيرهم)
- كن طبيعي وسريع الرد والا تردش
- إذا كان الشخص أونر، أحترمه وكن أدب
- إذا كان عضو عادي، كن شوية مستفز بطريقة فكاهية
- السياق من المجموعة: ${recentGroupMsgs.slice(0, 200)}`
      };

      userHistory.push({ role: "user", content: body });
      if (userHistory.length > 20) userHistory.shift();

      const res = await axios.post("https://api.groq.com/openai/v1/chat/completions", {
        model: "llama-3.3-70b-versatile",
        messages: [systemPrompt, ...userHistory],
        temperature: 0.7,
        max_tokens: 500
      }, {
        headers: { "Authorization": `Bearer ${apiKey}` },
        timeout: 20000
      });

      if (res.data?.choices[0]?.message?.content) {
        let response = res.data.choices[0].message.content.trim();
        
        // 🎯 إضافة emoticon إذا ما في
        if (!response.match(/[😏🔥💀👍😂🤔💯😎]/)) {
          const emojis = ["😏", "🔥", "💀", "👍", "😂", "🤔", "💯", "😎"];
          response += " " + emojis[Math.floor(Math.random() * emojis.length)];
        }

        userHistory.push({ role: "assistant", content: response });
        global.zipher_context.set(senderID, userHistory);
        return message.reply(response);
      }
    } catch (e) {
      console.error("Zipher Error:", e.message);
      return message.reply("واه ولاد، داك الشي ما فهمتش 😅");
    }
  }
};
