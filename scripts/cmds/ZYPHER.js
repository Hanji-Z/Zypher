const fs = require("fs-extra");
const path = require("path");

if (!global.zypherSniper) global.zypherSniper = {};

module.exports = {
  config: {
    name: "زيفࢪ",
    aliases: ["zypher"],
    version: "8.0.0",
    author: "Hanji",
    role: 2,
    shortDescription: "نظام زيفࢪ للإرسال المتكرر من ملف خارجي",
    category: "SYSTEM",
    guide: { en: ".زيفࢪ on | .زيفࢪ off" }
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, senderID, messageID } = event;
    const adminBot = global.GoatBot?.config?.adminBot || [];
    
    // تأكد بلي غير المطور هو لي يقدر يخدمو
    if (!adminBot.includes(senderID.toString())) return;

    const mode = args[0]?.toLowerCase();
    const cachePath = path.join(__dirname, "cache", "payload.txt");

    // إيلا الملف ما كاينش، كري واحد خاوي باش ما يوقعش Error
    if (!fs.existsSync(cachePath)) {
        fs.writeFileSync(cachePath, "Put your payload here, Hanji.");
    }

    // --- [ وضعية الإيقاف OFF ] ---
    if (mode === "off") {
        if (global.zypherSniper[threadID]) {
            global.zypherSniper[threadID].active = false;
            delete global.zypherSniper[threadID];
            return api.setMessageReaction("⏹️", messageID, () => {}, true);
        }
    }

    // --- [ وضعية التشغيل ON ] ---
    if (mode === "on") {
        if (global.zypherSniper[threadID]?.active) return;

        global.zypherSniper[threadID] = { active: true };
        api.setMessageReaction("🚀", messageID, () => {}, true);

        const startExecution = async () => {
            // التحقق واش الأمر باقي نشط فـ هاد المجموعة
            if (!global.zypherSniper[threadID] || !global.zypherSniper[threadID].active) return;

            try {
                // 📖 قراءة المحتوى من الملف ديريكت
                const payload = fs.readFileSync(cachePath, "utf-8");
                
                if (payload.trim() !== "") {
                    await api.sendMessage(payload, threadID);
                }

                // ⏳ الانتظار (7 ثواني) ثم إعادة الإرسال
                setTimeout(startExecution, 7000);

            } catch (e) {
                console.error("Zypher System Error:", e);
                delete global.zypherSniper[threadID];
            }
        };

        startExecution();
    }
  }
};
