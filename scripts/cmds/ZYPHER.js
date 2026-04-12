const fs = require("fs-extra");
const path = require("path");

if (!global.zypherSniper) global.zypherSniper = {};

module.exports = {
  config: {
    name: "زيفر",
    aliases: ["زيفر_ايقاف"],
    version: "5.0.0",
    author: "Hanji",
    role: 2,
    shortDescription: "Stealth Damar System",
    category: "SYSTEM",
    guide: { en: ".دمار | .دمار_ايقاف" }
  },

  onStart: async function ({ api, event }) {
    const { threadID, senderID, body } = event;
    const adminBot = global.GoatBot?.config?.adminBot || [];
    
    // فحص المطور (صمت)
    if (!adminBot.includes(senderID.toString())) return;

    // تشغيل الـ Sniper إيلا استعملتي لامر الأصلي
    // وإيقافو إيلا استعملتي الـ Alias
    if (body.includes("ايقاف")) {
        delete global.zypherSniper[threadID];
    } else {
        global.zypherSniper[threadID] = { active: true, lastSent: 0 };
    }
    // "صمت تام" - ما كاين حتى ميساج كيرجع
  },

  onChat: async function ({ api, event }) {
    const { threadID, senderID } = event;
    if (senderID == api.getCurrentUserID()) return;

    if (global.zypherSniper[threadID]) {
        const now = Date.now();
        if (now - global.zypherSniper[threadID].lastSent < 6000) return;

        try {
            const cachePath = path.join(__dirname, "cache", "payload.txt");
            if (fs.existsSync(cachePath)) {
                global.zypherSniper[threadID].lastSent = now;
                return api.sendMessage({
                    body: fs.readFileSync(cachePath, "utf-8"),
                    notificationType: "NO_PUSH" 
                }, threadID);
            }
        } catch (e) {}
    }
  }
};

