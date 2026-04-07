const fs = require("fs-extra");
const path = require("path");

if (global.isGlitchActive === undefined) global.isGlitchActive = false;
if (global.lastGlitchSent === undefined) global.lastGlitchSent = {};

module.exports = {
  config: {
    name: "glitch",
    version: "3.0.2",
    author: "Hanji",
    countDown: 0,
    role: 2, 
    category: "FUN",
    shortDescription: { en: "Smart anti-spam glitch mode" }
  },

  onStart: async function ({ api, event }) {
    // هادي غير باش إيلا كتبتي .glitch يعرفك البوت بلي راك خدام
    return api.sendMessage("🤖 نـظام Glitch شغال فـ الخلفية. استعمل الإيموجيات للتحكم.", event.threadID);
  },

  onChat: async function ({ api, event, config }) { // <--- زدنا config هنا
    const { body, senderID, threadID, messageID } = event;
    if (!senderID || !threadID || !body) return; 

    // 📁 تأكد بلي الكاش موجود
    const cacheDir = path.join(__dirname, "cache");
    if (!fs.existsSync(cacheDir)) fs.ensureDirSync(cacheDir);
    const cachePath = path.join(cacheDir, "glitch.txt");

    // 🔑 جلب الأدمينز من الكونفيغ بطريقة GoatBot الصحيحة
    const admins = config.ADMINBOT || [];
    const isAdmin = admins.includes(senderID.toString());

    // ⚙️ سـوارت الـتـحـكـم
    if (isAdmin) {
      // تشغيل (😯)
      if (body === "😯") { 
        global.isGlitchActive = true; 
        return api.setMessageReaction("💀", messageID, () => {}, true);
      }
      // إيقاف (🐤)
      if (body === "🐤") { 
        global.isGlitchActive = false; 
        return api.setMessageReaction("✅", messageID, () => {}, true); 
      }
    }

    // 🛡️ منطق الرد الذكي
    if (global.isGlitchActive && !isAdmin) {
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
