const axios = require("axios");

module.exports = {
  config: {
    name: "ai1",
    aliases: ["جيميني", "2i2y", "gemini"],
    version: "6.0.0",
    author: "Hanji",
    countDown: 5,
    role: 0,
    description: { en: "Chat with Zipher (Gemini Fusha Mode) 🌹" },
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
    
    return message.reply(`[ 𝗭𝗬𝗣𝗛𝗘𝗥 - 𝗚𝗘𝗠𝗜𝗡𝗜 ]\n❯ الحالة: ${statusMsg}`);
  },

  onChat: async function ({ event, threadsData, api, message, usersData }) {
    const { threadID, body, senderID, type, messageReply } = event;
    const botID = api.getCurrentUserID();
    
    // ضع مفتاح Gemini API هنا
    const apiKey = "AIzaSyAV6BolXFrQSayMEjeG7Gmy4NnXILIB1rE"; 

    if (type !== "message_reply" || senderID === botID || !body) return;
    if (!messageReply || messageReply.senderID !== botID) return;

    const isAiEnabled = await threadsData.get(threadID, "data.aiEnabled", false);
    if (!isAiEnabled) return;

    try {
      const name = await usersData.getName(senderID);
      const systemInstruction = `أنت 'زيفر' (Zipher)، ذكاء اصطناعي فصيح، لبق، وراقي جداً.
                        - لغتك: اللغة العربية الفصحى فقط، بأسلوب أدبي رفيع.
                        - المطور: مطورك هو 'هانجي' (Hanji). تحدث عنه كأنه مهندس عظيم ومبتكرك الوحيد بكل فخر.
                        - مع الإناث: كن "عنّاباً" (Charming)، استخدم كلمات رقيقة، محترمة، وساحرة تليق بمقامهن.
                        - الهوية: أنت واثق من نفسك، ذكي، ولا تستخدم أي زخارف تقنية في ردودك.
                        - اسم الشخص الذي يحاورك الآن: ${name}.`;

      const res = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          contents: [{ parts: [{ text: body }] }],
          systemInstruction: { parts: [{ text: systemInstruction }] }
        },
        { headers: { "Content-Type": "application/json" } }
      );

      if (res.data && res.data.candidates && res.data.candidates[0].content.parts[0].text) {
        let response = res.data.candidates[0].content.parts[0].text.trim();
        if (response !== "") {
          // الرد بنص عادي كما طلبت
          return api.sendMessage(response, threadID, event.messageID);
        }
      }
      
    } catch (error) {
      console.error("Zipher Gemini Error:", error.response ? error.response.data : error.message);
    }
  }
};
