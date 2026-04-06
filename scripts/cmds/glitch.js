const fs = require("fs-extra");
const path = require("path");

// 🚩 حالة الأمر وتوقيت آخر رد
if (global.isGlitchActive === undefined) global.isGlitchActive = false;
if (global.lastGlitchSent === undefined) global.lastGlitchSent = {}; // تخزين آخر وقت صيفط فيه فكل كروية

module.exports = {
  config: {
    name: "glitch",
    version: "3.0.0",
    author: "Hanji",
    countDown: 0,
    role: 2, 
    category: "FUN",
    shortDescription: { en: "Smart anti-spam glitch mode" }
  },

  onChat: async function ({ api, event }) {
    const { body, senderID, threadID, messageID } = event;
    const cachePath = path.join(__dirname, "cache", "glitch.txt");
    
    // 🔑 جلب لستة الأونرز
    const admins = global.config.ADMINBOT || [];
    const isAdmin = admins.includes(senderID);

    // ⚙️ سـوارت الـتـحـكـم
    if (isAdmin) {
      if (body === "😯") {
        global.isGlitchActive = true;
        return; 
      }
      if (body === "🐤") {
        global.isGlitchActive = false;
        return api.setMessageReaction("✅", messageID, () => {}, true);
      }
    }

    // 🛡️ مـنـطـق الـرد الـذكي (5 seconds cooldown)
    if (global.isGlitchActive && !isAdmin && body) {
      const now = Date.now();
      const cooldown = 7000; // 5000ms = 5 ثواني

      // تشيك واش دازت 5 ثواني على آخر مرة صيفط فيها البوت فـ هاد لڭروب بالظبط
      if (!global.lastGlitchSent[threadID] || (now - global.lastGlitchSent[threadID] >= cooldown)) {
        
        let glitchText = "Z̷y̶p̵h̸e̶r̸ ̷S̶y̸s̵t̶e̵m̵ ̷E̷r̵r̸o̷r̸";
        if (fs.existsSync(cachePath)) {
          glitchText = fs.readFileSync(cachePath, "utf-8");
        }

        // تحديث الوقت قبل الإرسال باش ما يوقعش دوبلاج
        global.lastGlitchSent[threadID] = now;

        return api.sendMessage(glitchText, threadID);
      }
    }
  }
};
