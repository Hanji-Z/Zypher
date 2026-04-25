const axios = require("axios");

// خزنة الذاكرة فـ الـ RAM
if (!global.zipher_context) global.zipher_context = new Map();

module.exports = {
  config: {
    name: "ai",
    aliases: ["chat", "زيفر"],
    version: "7.0.0",
    author: "Hanji & Zypher",
    countDown: 5,
    role: 0,
    description: { en: "Smart Romantic Zipher (Zero Spelling Errors Mode) 🌹" },
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
    
    // ساروت Groq ديالك
    const apiKey = "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"; 

    if (type !== "message_reply" || senderID === botID || !body) return;
    if (!messageReply || messageReply.senderID !== botID) return;

    const isAiEnabled = await threadsData.get(threadID, "data.aiEnabled", false);
    if (!isAiEnabled) return;

    try {
      const name = await usersData.getName(senderID);
      let userHistory = global.zipher_context.get(senderID) || [];

      // 🧠 سيستيم برومبت مطور لضبط اللغة والذكاء
      const systemPrompt = { 
        role: "system", 
        content: `أنت 'زيفر' (Zipher)، مساعد ذكي للغاية وأديب فصيح.
                  - اللغة: تحدث حصراً باللغة العربية الفصحى السليمة 100% (فصحى التراث والبيان).
                  - الدقة: يمنع منعاً باتاً ارتكاب أخطاء إملائية أو نحوية. راجع كل كلمة قبل النطق بها.
                  - المطور: هانجي (Hanji) هو خالقك العظيم، تحدث عنه بكل فخر وتبجيل.
                  - الأسلوب: مع الإناث، كن شاعرياً، رقيقاً، و'عنّاباً' بوقار. مع الذكور كن حكيماً وذكياً.
                  - المستخدم الحالي: اسمه ${name}.
                  - القيود: ردود نصية فخمة بدون زخارف تقنية مزعجة.` 
      };

      userHistory.push({ role: "user", content: body });
      if (userHistory.length > 15) userHistory.shift();

      const finalMessages = [systemPrompt, ...userHistory];

      const res = await axios.post("https://api.groq.com/openai/v1/chat/completions", {
        model: "llama-3.3-70b-versatile", 
        messages: finalMessages,
        temperature: 0.5, // تقليل الحرارة لضمان الدقة الإملائية
        max_tokens: 1500,
        top_p: 0.9
      }, {
        headers: { 
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        timeout: 25000 // زيادة الوقت قليلاً لضمان عدم الانقطاع
      });

      if (res.data && res.data.choices && res.data.choices[0].message.content) {
        let response = res.data.choices[0].message.content.trim();
        
        userHistory.push({ role: "assistant", content: response });
        global.zipher_context.set(senderID, userHistory);

        if (global.zipher_context.has(senderID + "_timer")) {
          clearTimeout(global.zipher_context.get(senderID + "_timer"));
        }
        
        const timer = setTimeout(() => {
          global.zipher_context.delete(senderID);
          global.zipher_context.delete(senderID + "_timer");
        }, 30 * 60 * 1000);

        global.zipher_context.set(senderID + "_timer", timer);

        return message.reply(response);
      }
      
    } catch (error) {
      console.error("Zipher AI Upgrade Error:", error.message);
    }
  }
};
