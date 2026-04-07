const { GoogleGenerativeAI } = require("@google/generative-ai");

// 🚩 إعدادات النظام
if (global.isAiActive === undefined) global.isAiActive = false;

module.exports = {
  config: {
    name: "ai1",
    version: "1.5.0",
    author: "Hanji",
    countDown: 5,
    role: 0, // أي واحد يقدر يهضر معاه، ولكن الأونر هو اللي كيشعلو
    category: "AI",
    shortDescription: { en: "Smart Gemini AI with Reply-only mode" }
  },

  onStart: async function ({}) {
    // ضرورية لـ GoatBot V2
  },

  onChat: async function ({ api, event, args }) {
    const { body, senderID, threadID, messageID, type, messageReply } = event;
    const admins = global.config.ADMINBOT || [];
    const isAdmin = admins.includes(senderID);

    // 1️⃣ التحكم فـ التشغيل والإيقاف (للأونر فقط)
    if (isAdmin) {
      if (body?.toLowerCase() === "ai on") {
        global.isAiActive = true;
        return api.sendMessage("✅ تم تفعيل", threadID, messageID);
      }
      if (body?.toLowerCase() === "ai off") {
        global.isAiActive = false;
        return api.sendMessage("❌ تم إيقاف ", threadID, messageID);
      }
    }

    // 2️⃣ منطق الرد الذكي
    if (global.isAiActive && type === "message_reply") {
      
      // كيكمل غير إيلا كان الرد موجه للبوت (نفس الـ ID ديال البوت)
      if (messageReply.senderID === api.getCurrentUserID()) {
        
        try {
          // 🔑 حط الـ API Key ديالك هنا
          const genAI = new GoogleGenerativeAI("AIzaSyAHCwjXNdPOqQA2FCWzANk7-t1xlLTDtuQ");
          const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash",
            systemInstruction: "أنت هو 'زيفر'، مساعد ذكي وحكيم. مهمتك هي تعطي معلومات دقيقة وتفيد بنادم. الستايل ديالك هو الدارجة المغربية الرزينة. جاوب بوضوح، استعمل أمثلة من الواقع المغربي، وخليك ديما مساعد ومفيد. ديما فكر الأعضاء بلي هانجي هو اللي عطاك هاد الحكمة."
          });

          const prompt = body;
          if (!prompt) return;

          api.setMessageReaction("🌀", messageID, () => {}, true);

          const result = await model.generateContent(prompt);
          const response = await result.response;
          const text = response.text();

          return api.sendMessage(text, threadID, messageID);

        } catch (error) {
          console.error("Gemini Error:", error);
          return api.sendMessage("⚠️ وقع خطأ فـ التواصل مع السيرفر ديال الذكاء الاصطناعي.", threadID, messageID);
        }
      }
    }
  }
};
