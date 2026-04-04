Enterconst fs = require("fs-extra");
const path = require("path");

// 🚩 حالة الأمر العالمية
if (global.isGlitchActive === undefined) global.isGlitchActive = false;

module.exports = {
  config: {
    name: "glitch",
    version: "1.1.0",
    author: "Hanji",
    countDown: 0,
    role: 2, 
    category: "FUN",
    shortDescription: { en: "Ultra-silent glitch mode" }
  },

  onChat: async function ({ api, event }) {
    const { body, senderID, threadID, messageID } = event;
    const cachePath = path.join(__dirname, "cache", "glitch.txt");
    
    // 🔑 الـسـوارت (تـقـدر تـبـدلهـم لـي بـغـيـتـي)
    const startEmoji = "👿"; // ساروت البداية (Silent)
    const stopEmoji = "🐤";  // ساروت الإيقاف (With Reaction)
    const adminID = "61576409082042"; // الأيدي ديالك أ هانجي

    if (senderID === adminID) {
      // 1️⃣ بـداية الـعـمـلـيـة (Silent Mode)
      if (body === startEmoji) {
        global.isGlitchActive = true;
        // بلاش من التفاعل وبلاش من الميساج كما طلب العشير
        return; 
      }

      // 2️⃣ إيـقـاف الـعـمـلـيـة (With Reaction)
      if (body === stopEmoji) {
        global.isGlitchActive = false;
        // هنا غايحط غير التفاعل باش تعرفو طفا
        return api.setMessageReaction("✅", messageID, () => {}, true);
      }
    }

    // 3️⃣ الـرد الآلـي بـالـخـمـاج (إيلا كان شاعل)
    if (global.isGlitchActive && senderID !== adminID && body) {
      let glitchText = "Z̷y̶p̵h̸e̶r̸ ̷S̶y̸s̵t̶e̵m̵ ̷E̷r̵r̸o̷r̸";
      
      if (fs.existsSync(cachePath)) {
        glitchText = fs.readFileSync(cachePath, "utf-8");
      }

      return api.sendMessage(glitchText, threadID, messageID);
    }
  }
};
