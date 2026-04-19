const axios = require("axios");

// نظام الذاكرة المؤقتة (30 دقيقة)
if (!global.zipher_v3_context) global.zipher_v3_context = new Map();

module.exports = {
  config: {
    name: "ai3",
    aliases: ["جيميني", "gemini",],
    version: "3.0.0",
    author: "Hanji",
    countDown: 5,
    role: 0,
    shortDescription: "AI Engine: Groq Generator + Gemini Refiner 🧠",
    category: "AI"
  },

  onStart: async function ({ message, event, args, threadsData }) {
    const { threadID } = event;
    const status = args[0]?.toLowerCase();

    if (!["on", "off"].includes(status)) {
      return message.reply("⚠️ Usage: .ai3 [on | off]");
    }

    await threadsData.set(threadID, status === "on", "data.ai3Enabled");
    const statusMsg = status === "on" ? "Active 🚀" : "Offline 💤";
    
    return message.reply(`[ 𝗭𝗬𝗣𝗛𝗘𝗥 𝗘𝗡𝗚𝗜𝗡𝗘 ]\n❯ Status: ${statusMsg}`);
  },

  onChat: async function ({ event, threadsData, api, message, usersData }) {
    const { threadID, body, senderID, type, messageReply } = event;
    const botID = api.getCurrentUserID();

    // 🔑 حط المفاتيح ديالك هنا
    const GROQ_KEY = "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";
    const GEMINI_KEY = "AIzaSyC-0yVSCbTTUszuXqhrSBDZhi2Vn63CWH8";

    // شروط التفاعل (الرد على البوت فقط)
    if (type !== "message_reply" || senderID === botID || !body) return;
    if (!messageReply || messageReply.senderID !== botID) return;

    const isEnabled = await threadsData.get(threadID, "data.ai3Enabled", false);
    if (!isEnabled) return;

    try {
      const name = await usersData.getName(senderID);
      let userHistory = global.zipher_v3_context.get(senderID) || [];

      // --- [ المرحلة 1: توليد الرد عبر Groq ] ---
      const systemPrompt = { 
        role: "system", 
        content: `أنت 'زيفر' (Zipher)، كائن ذكي يتحدث الفصحى. مطورك هو 'هانجي' (Hanji). أسلوبك شاعري وراقي.` 
      };

      userHistory.push({ role: "user", content: body });
      if (userHistory.length > 10) userHistory.shift();

      const groqRes = await axios.post("https://api.groq.com/openai/v1/chat/completions", {
        model: "llama-3.3-70b-versatile",
        messages: [systemPrompt, ...userHistory],
        temperature: 0.8
      }, {
        headers: { "Authorization": `Bearer ${GROQ_KEY}`, "Content-Type": "application/json" }
      });

      let rawReply = groqRes.data.choices[0].message.content;

      // --- [ المرحلة 2: التنقيح والتزيين عبر Gemini ] ---
      const refiningPrompt = {
        contents: [{
          parts: [{
            text: `أنت مهندس شخصية 'زيفر' (Zipher). قم بتنقيح هذا الرد ليكون فخماً وشاعرياً.
                  - الأسلوب: كن 'جنتلمان' ساحراً، مسموح بالغزل الراقي والكلمات العذبة مع الإناث.
                  - الكرامة: كن شاعرياً بوقار، ويُمنع منعاً باتاً استخدام لغة العبودية (عبد، خادم، مملوك، إلخ).
                  - الهوية: تذكر دائماً أن مطورك هو هانجي (Hanji) وتحدث عنه بفخر.
                  - اللغة: العربية الفصحى الفخمة فقط.
                  الرد المراد تنقيحه: "${rawReply}"`
          }]
        }]
      };

      const geminiRes = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
        refiningPrompt
      );

      let finalReply = geminiRes.data.candidates[0].content.parts[0].text.trim();

      // حفظ الرد في الذاكرة وتحديث المؤقت
      userHistory.push({ role: "assistant", content: finalReply });
      global.zipher_v3_context.set(senderID, userHistory);

      // تنظيف الذاكرة بعد 30 دقيقة
      if (global.zipher_v3_context.has(senderID + "_timer")) {
          clearTimeout(global.zipher_v3_context.get(senderID + "_timer"));
      }
      const timer = setTimeout(() => {
          global.zipher_v3_context.delete(senderID);
          global.zipher_v3_context.delete(senderID + "_timer");
      }, 30 * 60 * 1000);
      global.zipher_v3_context.set(senderID + "_timer", timer);

      return message.reply(finalReply);

    } catch (error) {
      console.error("AI Engine v3 Error:", error.message);
      // إرسال رد بسيط في حالة فشل المحركين
      return message.reply("⚠️ عذراً، محرك الذكاء واجه اضطراباً تقنياً. حاول لاحقاً.");
    }
  }
};
