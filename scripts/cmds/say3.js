const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "say3",
    aliases: ["speak", "voice"],
    version: "1.1.0",
    author: "Hanji",
    countDown: 5,
    role: 0,
    category: "UTILITY",
    shortDescription: { en: "Convert text to high-quality audio" },
    guide: { en: "{pn} <text>" }
  },

  onStart: async function ({ api, event, args, message }) {
    const { threadID, messageID, senderID } = event;
    const content = args.join(" ");
    
    // Put your Pollinations API Key here
    const apiKey = "sk_OWjdC7aSOyQwUAwFKlExkzmG7oUuuEt5"; 

    if (!content) return message.reply("⚠️ | Please provide some text to speak!");

    api.setMessageReaction("🎙️", messageID, () => {}, true);

    try {
      const voice = "nova"; 
      const apiUrl = `https://gen.pollinations.ai/audio/${encodeURIComponent(content)}?voice=${voice}`;
      
      const cachePath = path.join(__dirname, "cache", `say_${senderID}.mp3`);

      const res = await axios({
        method: 'get',
        url: apiUrl,
        headers: { 
          "Authorization": `Bearer ${apiKey}` 
        },
        responseType: 'stream'
      });

      const writer = fs.createWriteStream(cachePath);
      res.data.pipe(writer);

      writer.on('finish', () => {
        message.reply({
          attachment: fs.createReadStream(cachePath)
        }, () => {
          if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
          api.setMessageReaction("✅", messageID, () => {}, true);
        });
      });

      writer.on('error', (err) => { throw err; });

    } catch (error) {
      console.error("─── [ SAY COMMAND ERROR ] ───");
      console.error(error.message);
      api.setMessageReaction("❌", messageID, () => {}, true);
      return message.reply("❌ | An error occurred while generating audio.");
    }
  }
};
