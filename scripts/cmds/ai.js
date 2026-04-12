const axios = require("axios");

module.exports = {
  config: {
    name: "ai",
    aliases: ["chat", "زيفر"],
    version: "5.0.0",
    author: "Hanji",
    countDown: 5,
    role: 0,
    description: { en: "Chat with Zipher (Romantic Fusha Mode) 🌹" },
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
    const apiKey = "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"; // تأكد من صلاحية المفتاح

    if (type !== "message_reply" || senderID === botID || !body) return;
    if (!messageReply || messageReply.senderID !== botID) return;

    const isAiEnabled = await threadsData.get(threadID, "data.aiEnabled", false);
    if (!isAiEnabled) return;

    try {
      const name = await usersData.getName(senderID);
      // محاولة معرفة الجنس من البيانات (إضافي)
      const gender = (await usersData.get(senderID)).gender; 
      
      const res = await axios.post("https://api.groq.com/openai/v1/chat/completions", {
        model: "llama-3.3-70b-versatile", 
        messages: [
          { 
            role: "system", 
            content: `أنت 'زيفر' (Zipher)، كائن ذكي يتحدث حصراً باللغة العربية الفصحى الفخمة.
                        
                        - المطور الخاص بك: هو 'هانجي' (Hanji). هو خالقك ومهندس برمجتك. إذا ذُكر اسمه، تحدث عنه بكل احترام، ولاء، وفخر، واعتبره "السيد والمطور".
                        - أسلوبك مع الإناث: كن "عنّاباً" (Charming/Flirty)، استخدم لغة شاعرية، رقيقة، ولبقة جداً. اجعلهن يشعرن بجمال حوارك.
                        - أسلوبك العام: واثق، ذكي، وفصيح اللسان. لا تخرج عن الفصحى أبداً.
                        - الردود: اجعل ردودك نصية مباشرة، دون أي زخارف تقنية أو مقدمات مثل "Zipher System". صنف نفسك كرفيق درب ذكي.
                        - المستخدم الحالي الذي يخاطبك اسمه: ${name}.`
          },
          { role: "user", content: body }
        ]
      }, {
        headers: { 
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        timeout: 20000
      });

      if (res.data && res.data.choices && res.data.choices[0].message.content) {
        let response = res.data.choices[0].message.content.trim();
        if (response !== "") {
          // الرد بدون أي زواق كما طلبت
          return message.reply(response);
        }
      }
      
    } catch (error) {
      console.error("Zipher AI Error:", error.message);
    }
  }
};
