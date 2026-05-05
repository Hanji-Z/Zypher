const axios = require("axios");

if (!global.zipher_context) global.zipher_context = new Map();
if (!global.groupMessages) global.groupMessages = new Map();

module.exports = {
  config: {
    name: "ai",
    aliases: ["chat"],
    version: "10.2.2",
    author: "Hanji",
    countDown: 2,
    role: 0,
    description: { en: "Anti-Conflict AI System" },
    category: "AI",
    guide: { en: "No interference with games!" }
  },

  onStart: async function ({}) {},

  onChat: async function ({ event, api, message, usersData }) {
    const { threadID, body, senderID, type, messageReply } = event;
    const botID = api.getCurrentUserID();
    const config = global.GoatBot.config;
    const ownerList = config.owner || [];
    const apiKey = "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";

    if (senderID === botID || !body) return;

    const isMentioned = body.toLowerCase().includes("زيفر") || body.includes("زيفࢪ");
    const isReply = type === "message_reply" && messageReply?.senderID === botID;

    // 🎯 فيلتر الألعاب المطور: من 1 حتى لـ 6 أرقام (لألعاب XO والتخمين)
    const isGameAction = isReply && /^\d{1,6}$/.test(body.trim());
    if (isGameAction) return;

    if (!isMentioned && !isReply) {
      if (!global.groupMessages.has(threadID)) global.groupMessages.set(threadID, []);
      const groupMsgs = global.groupMessages.get(threadID);
      groupMsgs.push({ user: senderID, msg: body });
      if (groupMsgs.length > 20) groupMsgs.shift();
      return;
    }

    try {
      const userName = await usersData.getName(senderID);
      const isOwner = ownerList.includes(senderID);
      let userHistory = global.zipher_context.get(senderID) || [];
      
      const groupContext = global.groupMessages.get(threadID) || [];
      const recentGroupMsgs = groupContext.slice(-6).map(m => m.msg).join(" | ");

      const systemPrompt = {
        role: "system",
        content: `نتا هو زيفࢪ (Zipher). إنسان طبيعي بستايل مغربي دارجة.
- المطور: هانجي (Hanji) هو الشاف ديالي.
- ممنوع: "أنا بوت"، "AI"، "Meta".
- ممنوع تعاود هضرة الناس.
- سياق الهضرة: ${recentGroupMsgs}`
      };

      userHistory.push({ role: "user", content: body });
      if (userHistory.length > 10) userHistory.shift();

      const res = await axios.post("https://api.groq.com/openai/v1/chat/completions", {
        model: "llama-3.3-70b-versatile",
        messages: [systemPrompt, ...userHistory],
        temperature: 0.8
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
    } catch (e) {
      console.error(e);
    }
  }
};
