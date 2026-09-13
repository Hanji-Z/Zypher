const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "1sp",
    version: "1.0.0",
    author: "Zypher (Hanji)",
    role: 2, // للآدمن فقط
    category: "SYSTEM",
    shortDescription: { en: "Auto-send words from a txt file via emoji trigger" },
    guide: { en: "Send 🥢 to start, 🐤 to stop." }
  },

  onLoad: function () {
    // 1. إنشاء ملف الكلمات إيلا مكانش
    const txtPath = path.join(__dirname, "cache", "words.txt");
    if (!fs.existsSync(txtPath)) {
      fs.writeFileSync(txtPath, "زيفر\nحاضر\nناضي\nقرطاسة\nهانجي المطور", "utf-8");
    }
    // 2. تجهيز الذاكرة باش نفرقو بين لڭروبات
    if (!global.ZypherSpam) {
      global.ZypherSpam = {};
    }
  },

  // 🛠️ التعديل المهم: زدنا onStart باش Railway يقبل الملف
  onStart: async function ({ api, event }) {
    const sidebar = "█║ ";
    return api.sendMessage(`${sidebar}هاد الأمر خدام غير بـ الإيموجيات أ المعلم!\n${sidebar}❯ لوح 🥢 باش تبدا الرشاش.\n${sidebar}❯ لوح 🐤 باش تحبسو.`, event.threadID, event.messageID);
  },

  // غنخدمو بـ onChat باش البوت يقرا كاع الميساجات ويقلب على الإيموجي
  onChat: async function ({ api, event }) {
    const { body, threadID, messageID } = event;

    if (global.GoatBot.config.scheduledMessageTasks?.enable !== true) return;

    // إيلا ماكانش ميساج نصي، زكل
    if (!body) return;

    // 🥢 --- [ إيموجي البداية ] ---
    if (body === "🥢") {
      // إيلا كان ديجا خدام فـ هاد لڭروب، مايدير والو
      if (global.ZypherSpam[threadID]) return api.setMessageReaction("⚠️", messageID, () => {}, true);

      const txtPath = path.join(__dirname, "cache", "words.txt");
      
      try {
        // قراءة الملف وتقسيم السطور
        const content = fs.readFileSync(txtPath, "utf-8");
        const lines = content.split('\n').filter(line => line.trim() !== "");

        if (lines.length === 0) return api.sendMessage("The file is empty", threadID);

        api.setMessageReaction("🔥", messageID, () => {}, true);
        
        let index = 0;
        const maxRuntimeMs = Math.max(1000, Number(global.GoatBot.config.scheduledMessageTasks.maxRuntimeMs) || 600000);
        const startedAt = Date.now();
        global.ZypherSpam[threadID] = setInterval(() => {
          if (Date.now() - startedAt >= maxRuntimeMs) {
            clearInterval(global.ZypherSpam[threadID]);
            delete global.ZypherSpam[threadID];
            return;
          }
          api.sendMessage(lines[index], threadID);
          index++;
          
          // إيلا سالاو الكلمات، يعاود من الأول (Loop)
          if (index >= lines.length) index = 0; 
        }, 1300); 

      } catch (e) {
        console.error("Spam Error:", e);
      }
    }

    // 🐤 --- [ إيموجي النهاية ] ---
    if (body === "🐤") { 
      if (global.ZypherSpam[threadID]) {
        clearInterval(global.ZypherSpam[threadID]); // حبس الرشاش
        delete global.ZypherSpam[threadID]; // مسح لڭروب من الذاكرة
        
        api.setMessageReaction("✅", messageID, () => {}, true);
        api.sendMessage("[ 𝗭𝗬𝗣𝗛𝗘𝗥 𝗦𝗬𝗦𝗧𝗘𝗠 ]\nتم الإيقاف بنجاح 🥢⛔", threadID);
      }
    }
  }
};
