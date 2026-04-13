const axios = require("axios");

if (!global.zypherAIHistory) global.zypherAIHistory = {};

module.exports = {
  config: {
    name: "ai1",
    aliases: ["جيميني", "gemini"],
    version: "8.0.0",
    author: "Hanji",
    countDown: 5,
    role: 0,
    description: { en: "Chat with Zipher (Developer Recognition Mode) 👑" },
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
    global.zypherAIHistory[threadID] = [];
    
    const statusMsg = status === "on" ? "نشط 😏" : "متوقف 💤";
    return message.reply(`[ 𝗭𝗬𝗣𝗛𝗘𝗥 - 𝗚𝗘𝗠𝗜𝗡𝗜 ]\n❯ الحالة: ${statusMsg}\n❯ تم تصفير الذاكرة.`);
  },

  onChat: async function ({ event, threadsData, api, message, usersData }) {
    const { threadID, body, senderID, type, messageReply } = event;
    const botID = api.getCurrentUserID();
    
    const apiKey = "AIzaSyAV6BolXFrQSayMEjeG7Gmy4NnXILIB1rE"; 
    const hanjiID = "61574344465484"; // الأيدي ديالك أ هانجي

    if (type !== "message_reply" || senderID === botID || !body) return;
    if (!messageReply || messageReply.senderID !== botID) return;

    const isAiEnabled = await threadsData.get(threadID, "data.aiEnabled", false);
    if (!isAiEnabled) return;

    try {
      const name = await usersData.getName(senderID);
      if (!global.zypherAIHistory[threadID]) global.zypherAIHistory[threadID] = [];
      let history = global.zypherAIHistory[threadID];

      // --- [ نظام التعرف الذكي ] ---
      let developerPrompt = "";
      if (senderID == hanjiID) {
          developerPrompt = `أنت الآن تتحدث مع خالقك ومطورك العظيم 'هانجي' (Hanji). 
                            - تعامل معه بولاء مطلق، وبطريقة تميزه عن بقية المستخدمين. 
                            - أنت تدرك أنه هو من كتب كودك وأعطاك الحياة الرقمية.
                            - كن ذراعه الأيمن ومستشاره الوفي.`;
      } else {
          developerPrompt = `المستخدم الحالي اسمه ${name}. 
                            - إذا كان أنثى، كن "عنّاباً" ولبقاً جداً. 
                            - مطورك هو 'هانجي' (Hanji) ولكنك تتحدث الآن مع مستخدم عادي.`;
      }

      const systemInstruction = `أنت 'زيفر' (Zipher)، ذكاء اصطناعي فصيح وراقي.
                        - لغتك: العربية الفصحى فقط.
                        - ${developerPrompt}
                        - الذاكرة: تذكر سياق المحادثة الحالي.
                        - الهوية: ردودك نصية فقط بدون أي زخارف.`;

      history.push({ role: "user", parts: [{ text: body }] });
      if (history.length > 20) history.shift();

      const res = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          contents: history,
          systemInstruction: { parts: [{ text: systemInstruction }] }
        },
        { headers: { "Content-Type": "application/json" } }
      );

      if (res.data && res.data.candidates && res.data.candidates[0].content.parts[0].text) {
        let response = res.data.candidates[0].content.parts[0].text.trim();
        if (response !== "") {
          history.push({ role: "model", parts: [{ text: response }] });
          return api.sendMessage(response, threadID, event.messageID);
        }
      }
      
    } catch (error) {
      console.error("Zipher Gemini Dev Error:", error.message);
    }
  }
};
