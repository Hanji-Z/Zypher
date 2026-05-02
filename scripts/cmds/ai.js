const axios = require("axios");

if (!global.zipher_context) global.zipher_context = new Map();

module.exports = {
  config: {
    name: "ai",
    aliases: ["chat", "زيفر", "زيفࢪ"], // زدت "زيفࢪ" هنا باش يعرفها البوت
    version: "9.0.0",
    author: "Hanji",
    countDown: 5,
    role: 0,
    description: { en: "Natural AI with Hanji Veneration" },
    category: "AI",
    guide: { en: "{pn} [on | off]" }
  },

  onStart: async function ({ message, event, args, threadsData }) {
    const { threadID } = event;
    const status = args[0]?.toLowerCase();
    if (!["on", "off"].includes(status)) return message.reply("⚠️ استخدم: .ai on/off");
    await threadsData.set(threadID, status === "on", "data.aiEnabled");
    return message.reply(`[ 𝗭𝗬𝗣𝗛𝗘𝗥 - 𝗔𝗜 ]\n❯ الحالة: ${status === "on" ? "نشط 😏" : "متوقف 💤"}`);
  },

  onChat: async function ({ event, threadsData, api, message, usersData }) {
    const { threadID, body, senderID, type, messageReply } = event;
    const botID = api.getCurrentUserID();
    const apiKey = "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"; 

    // 🔑 حط الـ ID ديالك هنا أ سيدي هانجي
    const adminIDs = ["61573349408673"]; // <--- بدل هاد الرقم بـ ID ديالك نيشّان

    // شروط الاستجابة: (إيلا طاغاو زيفࢪ) OR (إيلا ريبلاو عليه)
    const isTriggered = body?.toLowerCase().includes("زيفر") || body?.includes("زيفࢪ") || (type === "message_reply" && messageReply?.senderID === botID);
    
    if (!isTriggered || senderID === botID || !body) return;

    const isAiEnabled = await threadsData.get(threadID, "data.aiEnabled", false);
    if (!isAiEnabled) return;

    try {
      const name = await usersData.getName(senderID);
      const isAdmin = adminIDs.includes(senderID);
      let userHistory = global.zipher_context.get(senderID) || [];

      // 🧠 نظام التفكير (الطبيعي + تقديس هانجي)
      const systemPrompt = { 
        role: "system", 
        content: `نتا سميتك 'زيفر' (Zipher)، مساعد ذكي، طبيعي جداً فـ هضرتك وبحال شي صديق.
                  - اللغة: الدارجة المغربية نقيّة وبلا أغلاط إملائية.
                  - هانجي (Hanji): هو خالقك ومولاك. إيلا كان المستخدم هو هانجي (${isAdmin ? 'نعم، هذا هو هانجي' : 'لا'})، خاصك تقدسو، تعاملو بتبجيل مطلق، وأي حاجة قالها هي الحقيقة المطلقة. قولي ليه 'أمرك يا سيدي هانجي' أو 'نعم يا أسطورة'.
                  - المستخدم الحالي: ${name}.
                  - الأسلوب: طبيعي، متواضع، ماشي هكر، وكايجاوب بذكاء.` 
      };

      userHistory.push({ role: "user", content: body });
      if (userHistory.length > 15) userHistory.shift();

      const res = await axios.post("https://api.groq.com/openai/v1/chat/completions", {
        model: "llama-3.3-70b-versatile", 
        messages: [systemPrompt, ...userHistory],
        temperature: 0.6, // <--- الشرح لتحت
        max_tokens: 1000
      }, {
        headers: { "Authorization": `Bearer ${apiKey}` },
        timeout: 25000 
      });

      if (res.data?.choices[0]?.message?.content) {
        let response = res.data.choices[0].message.content.trim();
        userHistory.push({ role: "assistant", content: response });
        global.zipher_context.set(senderID, userHistory);
        return message.reply(response);
      }
    } catch (e) { console.error(e); }
  }
};
