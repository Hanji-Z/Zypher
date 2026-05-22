/*
  ╔══════════════════════════════════════════╗
  ║      EMOJI PROTECT — v1.0                ║
  ║  🕷  أشيل كل أدمنات القروب (ما عدا أنت) ║
  ║  🕴  عيّن نفسك أدمن في القروب الحالي    ║
  ╚══════════════════════════════════════════╝
  يشتغل عبر onChat (بدون prefix) — لأدمنات البوت فقط
*/

module.exports = {
  config: {
    name: "emojiprotect",
    version: "1.0",
    author: "ShAn",
    role: 0,
    countDown: 0,
    category: "events",
    shortDescription: "حماية الأدمن بالإيموجي 🕷🕴"
  },

  // onChat يُنادى لكل رسالة حتى بدون prefix
  onChat: async function ({ api, event }) {
    const { threadID, senderID, body, messageID } = event;
    if (!body || !event.isGroup) return;

    const adminBot = (global.GoatBot.config.adminBot || []).map(String);
    if (!adminBot.includes(String(senderID))) return;

    const botID = String(api.getCurrentUserID());
    const msg   = body.trim();

    // ══════════════════════════════════════
    // 🕷  إزالة صلاحيات كل الأدمنات
    // ══════════════════════════════════════
    if (msg === "🕷") {
      try {
        const info = await api.getThreadInfo(threadID);
        if (!info) return;

        const targets = (info.adminIDs || [])
          .map(a => String(a.id || a))
          .filter(id => id !== String(senderID) && id !== botID);

        if (!targets.length) return;

        api.setMessageReaction("🕷", messageID, () => {}, true);

        for (const id of targets) {
          await api.changeAdminStatus(threadID, id, false).catch(() => {});
          await new Promise(r => setTimeout(r, 500));
        }
      } catch (e) {
        console.error("❌ emojiprotect 🕷:", e.message);
      }
      return;
    }

    // ══════════════════════════════════════
    // 🕴  تعيين نفسك أدمن في القروب الحالي
    // ══════════════════════════════════════
    if (msg === "🕴") {
      try {
        await api.changeAdminStatus(threadID, senderID, true);
        api.setMessageReaction("🕴", messageID, () => {}, true);
      } catch (e) {
        console.error("❌ emojiprotect 🕴:", e.message);
      }
      return;
    }
  }
};
