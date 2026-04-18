const axios = require("axios");

// خزنة الذاكرة فـ الـ RAM
if (!global.zipher_context) global.zipher_context = new Map();

module.exports = {
  config: {
    name: "ai",
    aliases: ["chat", "زيفر"],
    version: "6.0.0", // تحديث النسخة
    author: "Hanji & Zypher",
    countDown: 5,
    role: 0,
    description: { en: "Chat with Zipher (Romantic Fusha Mode) with 30min memory 🌹" },
    category: "AI",
    guide: { en: "{pn} [on | off]" }
  },

  onStart: async function ({ message, event, args, threadsData }) {
    const { threadID } = event;
    const status = args[0]?.toLowerCase();

    if (!["on", "off"].includes(status)) {
      return message.reply("⚠️ استخدم: .ai on للتشغيل أو .ai off للإيقاف.");
    }

    await threadsData.set(threadID, status === "on", "data.aiEnabled");
    const statusMsg = status === "on" ? "نشط 😏" : "متوقف 💤";
    
    return message.reply(`[ 𝗭𝗬𝗣𝗛𝗘𝗥 - 𝗔𝗜 ]\n❯ الحالة: ${statusMsg}`);
  },

  onChat: async function ({ event, threadsData, api, message, usersData }) {
    const { threadID, body, senderID, type, messageReply } = event;
    const botID = api.getCurrentUserID();
    const apiKey = "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"; 

    if (type !== "message_reply" || senderID === botID || !body) return;
    if (!messageReply || messageReply.senderID !== botID) return;

    const isAiEnabled = await threadsData.get(threadID, "data.aiEnabled", false);
    if (!isAiEnabled) return;

    try {
      const name = await usersData.getName(senderID);
      
      // 1. جلب الهيستوري ديال اليوزر
      let userHistory = global.zipher_context.get(senderID) || [];

      // 2. سيستيم برومبت (ديما كيبقى هو الأول)
      const systemPrompt = { 
        role: "system", 
        content: `أنت 'زيفر' (Zipher)، كائن ذكي يتحدث حصراً باللغة العربية الفصحى الفخمة.
                  - المطور الخاص بك: هو 'هانجي' (Hanji). تحدث عنه بكل فخر واعتبره "السيد والمطور".
                  - أسلوبك مع الإناث: كن "عنّاباً" (Flirty) وشاعرياً.
                  - المستخدم الحالي اسمه: ${name}.
                  - ردودك: نصية مباشرة بلا زخارف تقنية.` 
      };

      // 3. إضافة رسالة اليوزر الجديدة للهيستوري
      userHistory.push({ role: "user", content: body });

      // 4. الحفاظ على آخر 15 رسالة فقط (باش ما يوقعش Overflow)
      if (userHistory.length > 15) userHistory.shift();

      // 5. بناء الميساجات كاملة (System + History)
      const finalMessages = [systemPrompt, ...userHistory];

      const res = await axios.post("https://api.groq.com/openai/v1/chat/completions", {
        model: "llama-3.3-70b-versatile", 
        messages: finalMessages,
        temperature: 0.7,
        max_tokens: 1024
      }, {
        headers: { 
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        timeout: 20000
      });

      if (res.data && res.data.choices && res.data.choices[0].message.content) {
        let response = res.data.choices[0].message.content.trim();
        
        // 6. حفظ رد البوت فـ الهيستوري باش يعقل عليه
        userHistory.push({ role: "assistant", content: response });
        global.zipher_context.set(senderID, userHistory);

        // 7. بلان المسح التلقائي (30 دقيقة من آخر تفاعل)
        if (global.zipher_context.has(senderID + "_timer")) {
          clearTimeout(global.zipher_context.get(senderID + "_timer"));
        }
        
        const timer = setTimeout(() => {
          global.zipher_context.delete(senderID);
          global.zipher_context.delete(senderID + "_timer");
        }, 30 * 60 * 1000); // 30 دقيقة

        global.zipher_context.set(senderID + "_timer", timer);

        return message.reply(response);
      }
      
    } catch (error) {
      console.error("Zipher AI Memory Error:", error.message);
    }
  }
};
