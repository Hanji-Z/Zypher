const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "glitch",
    version: "3.1.0",
    author: "Hanji",
    countDown: 0,
    role: 2, // الأدمينز فقط هما اللي غايقدروا يخدموه
    category: "FUN",
    shortDescription: { en: "Smart glitch mode with simplified admin check" }
  },

  onLoad: function () {
    const cachePath = path.join(__dirname, "cache", "glitch.txt");
    if (!fs.existsSync(path.join(__dirname, "cache"))) fs.ensureDirSync(path.join(__dirname, "cache"));
    if (!fs.existsSync(cachePath)) {
      fs.writeFileSync(cachePath, "Z̷y̶p̵h̸e̶r̸ ̷S̶y̸s̵t̶e̵m̵ ̷E̷r̵r̸o̷r̸", "utf-8");
    }
    if (!global.isGlitchActive) global.isGlitchActive = {};
    if (!global.lastGlitchSent) global.lastGlitchSent = {};
  },

  onStart: async function ({ api, event }) {
    const sidebar = "█║ ";
    return api.sendMessage(`${sidebar}نظام الـ Glitch الذكي 🤖\n${sidebar}❯ لوح 😯 باش تبدا القمع.\n${sidebar}❯ لوح 🐤 باش تحبسو.`, event.threadID, event.messageID);
  },

  onChat: async function ({ api, event }) {
    const { body, threadID, messageID, senderID } = event;
    if (!body) return;

    // 🥢 --- [ إيموجي البداية: 😯 ] ---
    if (body === "😯") {
      global.isGlitchActive[threadID] = true;
      return api.setMessageReaction("😯", messageID, () => {}, true);
    }

    // 🐤 --- [ إيموجي النهاية: 🐤 ] ---
    if (body === "🐤") { 
      if (global.isGlitchActive[threadID]) {
        delete global.isGlitchActive[threadID];
        return api.setMessageReaction("✅", messageID, () => {}, true);
      }
    }

    // 🛡️ --- [ منطق الرد الذكي: 5 ثواني ] ---
    // البوت غايرد غير إيلا كان الـ Glitch شاعل و اللي كيهضر ماشي هو اللي شعل الأمر
    if (global.isGlitchActive[threadID]) {
      const now = Date.now();
      const cooldown = 5000; 

      if (!global.lastGlitchSent[threadID] || (now - global.lastGlitchSent[threadID] >= cooldown)) {
        const cachePath = path.join(__dirname, "cache", "glitch.txt");
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
