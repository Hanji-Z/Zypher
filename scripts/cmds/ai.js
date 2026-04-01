const axios = require("axios");

module.exports = {
  config: {
    name: "ai",
    aliases: ["chat", "zipher"],
    version: "4.0.0",
    author: "Zypher",
    countDown: 5,
    role: 0, // كولشي يقدر يخدمو
    description: { en: "Chat with Zipher AI (Wild Mode) 😏" },
    category: "AI",
    guide: { en: "{pn} [on | off] | Reply to the bot." }
  },

  onStart: async function ({ message, event, args, threadsData }) {
    const { threadID } = event;
    const sidebar = "█║ ";
    const line = "█║──────────────────";
    const status = args[0]?.toLowerCase();

    if (!["on", "off"].includes(status)) {
      return message.reply(`[ 𝗭𝗬𝗣𝗛𝗘𝗥 - 𝗔𝗜 ]\n${line}\n${sidebar}⚠️ Use: .ai [on | off]`);
    }

    await threadsData.set(threadID, status === "on", "data.aiEnabled");

    const statusMsg = status === "on" ? "ACTIVE 😏" : "INACTIVE 💤";
    
    return message.reply(`[ 𝗭𝗬𝗣𝗛𝗘𝗥 - 𝗖𝗢𝗡𝗙𝗜𝗚 ]\n${line}\n${sidebar}❯ 𝗦𝗧𝗔𝗧𝗨𝗦: ${statusMsg}\n${line}\n${sidebar}[ 𝗢𝗣𝗘𝗥𝗔𝗧𝗜𝗢𝗡𝗔𝗟 ]`);
  },

  onChat: async function ({ event, threadsData, api, message }) {
    const { threadID, body, senderID, type, messageReply } = event;
    const botID = api.getCurrentUserID();
    const sidebar = "█║ ";

    // التآكد بلي الـ API Key محطوط فـ الـ config د البوت (أحسن طريقة)
    // إيلا ماعندكش، حطو هنا ديريكت (وخا ماشي آمنة)
    const apiKey = global.config?.GROQ_API_KEY || "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";

    if (type !== "message_reply" || senderID === botID || !body) return;
    if (!messageReply || messageReply.senderID !== botID) return;

    const isAiEnabled = await threadsData.get(threadID, "data.aiEnabled", false);
    if (!isAiEnabled) return;

    // تآكد بلي الـ API Key خدام
    if (!apiKey || apiKey.startsWith("YOUR_")) {
        console.error("Zipher AI Error: GROQ_API_KEY is missing or invalid.");
        return; // سكت بلا ما يصدع الدراري
    }

    try {
      const res = await axios.post("https://api.groq.com/openai/v1/chat/completions", {
        model: "llama-3.3-70b-versatile", 
        messages: [
          { 
            role: "system", 
            content: `أنت 'زيفر' (Zipher)، بوت ذكي، واثق من نفسه جداً، وضاسر شوية (Cocky/Witty). تتحدث بلهجة عامية عربية/مغربية خفيفة وواضحة.
                        
                        - شخصيتك: ذكي، ساخر، عَفوي، ولا يجامل أحداً. لا تستخدم كلمات حب أو دلال.
                        - أسلوبك: ردودك قصيرة، قوية، ومباشرة. تعامل الجميع بنفس الأسلوب الساخر والواثق.
                        - إذا مدحك أحد: اقبل المدح بتكبر مضحك (مثلاً: 'عارف راسي ناضي'، 'شكراً، أنا أصلاً هربان').
                        - إذا انتقدك أحد: رد بسخرية وثقة (مثلاً: 'شوف شكون كيهضر'، 'هدرتك متهمنيش').
                        - ملاحظة: التزم بصيغة المذكر دائماً في كلامكِ (أنا عارف، شفت، فكرت...). إياك أن تتحدث كفتاة.`
          },
          { role: "user", content: body }
        ]
      }, {
        headers: { 
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        timeout: 20000 // زيد الوقت شوية حيت Groq بعض المرات كيتعطل
      });

      if (res.data && res.data.choices && res.data.choices[0].message.content) {
        let response = res.data.choices[0].message.content.trim();
        
        if (response !== "") {
          return message.reply(`[ 𝗭𝗬𝗣𝗛𝗘𝗥 ]\n${sidebar}${response}`);
        }
      }
      
    } catch (error) {
      console.error("Zipher AI Error:", error.message);
      // سكت بلا ما يدير الروينة إيلا كاين إيرور
    }
  }
};
