/*
  ╔══════════════════════════════════════════╗
  ║      EMOJI PROTECT — v1.1                ║
  ║  🕷  أشيل كل أدمنات القروب (ما عدا أنت) ║
  ║  🕴  عيّن نفسك أدمن في القروب الحالي    ║
  ╚══════════════════════════════════════════╝
*/

// ─── نظّف الإيموجي من variation selectors (\uFE0F, \uFE0E) ───
function cleanEmoji(str) {
  return (str || "").replace(/\uFE0F|\uFE0E/g, "").trim();
}

module.exports = {
  config: {
    name: "emojiprotect",
    version: "1.1",
    author: "ShAn",
    role: 0,
    countDown: 0,
    category: "events",
    shortDescription: "حماية الأدمن بالإيموجي 🕷🕴"
  },

  // ─── onStart مطلوب في GoatBot وإلا يرفض تحميل الملف ───
  onStart: async function () {},

  // ─── onChat يُنادى لكل رسالة حتى بدون prefix ───
  onChat: async function ({ api, event }) {
    const { threadID, senderID, body, messageID, isGroup } = event;
    if (!body || !isGroup) return;

    const adminBot = (global.GoatBot?.config?.adminBot || []).map(String);
    if (!adminBot.includes(String(senderID))) return;

    const botID = String(api.getCurrentUserID());
    const msg   = cleanEmoji(body);

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
