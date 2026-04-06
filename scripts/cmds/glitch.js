const fs = require("fs-extra");
const path = require("path");

if (global.isGlitchActive === undefined) global.isGlitchActive = false;
if (global.lastGlitchSent === undefined) global.lastGlitchSent = {};

module.exports = {
  config: {
    name: "glitch",
    version: "3.0.1",
    author: "Hanji",
    countDown: 0,
    role: 2, 
    category: "FUN", // <--- تأكد بلي كاينة
    shortDescription: { en: "Smart anti-spam glitch mode" }
  },

  onStart: async function ({}) {
    // ضرورية فـ GoatBot V2
  },

  onChat: async function ({ api, event }) {
    const { body, senderID, threadID, messageID } = event;
    if (!senderID || !threadID) return; // حل مشكل INVALID_USER_ID

    const cachePath = path.join(__dirname, "cache", "glitch.txt");
    const admins = global.config.ADMINBOT || [];
    const isAdmin = admins.includes(senderID);

    if (isAdmin) {
      if (body === "😯") { global.isGlitchActive = true; return; }
      if (body === "🐤") { global.isGlitchActive = false; return api.setMessageReaction("✅", messageID, () => {}, true); }
    }

    if (global.isGlitchActive && !isAdmin && body) {
      const now = Date.now();
      const cooldown = 5000; 

      if (!global.lastGlitchSent[threadID] || (now - global.lastGlitchSent[threadID] >= cooldown)) {
        let glitchText = "Z̷y̶p̵h̸e̶r̸ ̷S̶y̸s̵t̶e̵m̵ ̷E̷r̵r̸o̷r̸";
        if (fs.existsSync(cachePath)) {
          glitchText = fs.readFileSync(cachePath, "utf-8");
        }
        global.lastGlitchSent[threadID] = now;
        return api.sendMessage(glitchText, threadID);
      }
    }
  }
};
