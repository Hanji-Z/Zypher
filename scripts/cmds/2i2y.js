const { GoogleGenerativeAI } = require("@google/generative-ai");

module.exports = {
  config: {
    name: "ai1",
    version: "1.1.0",
    hasPermssion: 0,
    credits: "Hanji",
    description: "Gemini AI مع خاصية الرد التلقائي",
    category: "AI", // هنا فين كان المشكل، دابا مريكل
    usages: "[السؤال]",
    cooldowns: 2,
  },

  run: async function({ api, event, args }) {
    const { threadID, messageID, senderID } = event;
    const prompt = args.join(" ");

    if (!prompt) return api.sendMessage("خاي هانجي، كتب شي سؤال ولا دير ريبلاي للبوت!", threadID, messageID);

    return await this.handleAI(prompt, api, event);
  },

  handleReply: async function({ api, event, handleReply }) {
    const { body } = event;
    if (handleReply.author != event.senderID) return; 
    
    return await this.handleAI(body, api, event);
  },

  handleAI: async function(prompt, api, event) {
    const { threadID, messageID, senderID } = event;
    const genAI = new GoogleGenerativeAI("AIzaSyDVkSFH8jzdaSuEfc4waiC9aqGu6eQiW80");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      api.sendMessage(text, threadID, (err, info) => {
        if (err) return;
        global.client.handleReply.push({
          name: this.config.name,
          messageID: info.messageID,
          author: senderID
        });
      }, messageID);
    } catch (error) {
      api.sendMessage("وقع مشكل فالاتصال، حاول مرة أخرى.", threadID, messageID);
    }
  }
};
