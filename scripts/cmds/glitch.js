const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "glitch",
    version: "3.0.5",
    author: "Hanji",
    countDown: 0,
    role: 2, 
    category: "FUN",
    shortDescription: { en: "Smart anti-spam glitch mode" }
  },

  onLoad: function () {
    // تجهيز الملف والذاكرة بنفس ستايل 1sp
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
    return api.sendMessage(`${sidebar}نظام الـ Glitch الذكي\n${sidebar}❯ لوح 😯 باش تشعلو فـ هاد لڭروب.\n${sidebar}❯ لوح 🐤 باش تطفيه.`, event.threadID, event.messageID);
  },

  onChat: async function ({ api, event }) {
    const { body, senderID, threadID, messageID } = event;
    if (!body) return;

    // جلب الأدمينز من ملف الـ Config (الطريقة المضمونة)
    const admins = global.config.ADMINBOT || [];
    const isAdmin = admins.includes(senderID.toString());

    // ⚙️ التحكم (للأدمينز فقط)
    if (isAdmin) {
      if (body === "😯") {
        global.isGlitchActive[threadID] = true;
        return api.setMessageReaction("😯", messageID, () => {}, true);
      }
      if (body === "🐤") {
        delete global.isGlitchActive[threadID];
        return api.setMessageReaction("✅", messageID, () => {}, true);
      }
    }

    // 🛡️ منطق الرد الذكي (5 ثواني)
    if (global.isGlitchActive[threadID] && !isAdmin) {
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
