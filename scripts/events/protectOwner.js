/*
  ╔══════════════════════════════════════════╗
  ║    PROTECT OWNER — v4.0                  ║
  ║  • طرد أدمن بوت → يكيك اللي طرده + يرجع ║
  ║  • إزالة صلاحياته → يشيل كل الأدمنات   ║
  ║  ⚠️ البوت نفسه محذوف من الحماية          ║
  ╚══════════════════════════════════════════╝
*/

module.exports = {
  config: {
    name: "protectOwner",
    version: "4.0",
    author: "ShAn",
    category: "events"
  },

  onStart: async ({ event, api }) => {
    const adminBot = (global.GoatBot?.config?.adminBot || []).map(String);
    const botID    = String(api.getCurrentUserID());

    const { threadID, logMessageType, logMessageData, author } = event;
    if (!logMessageType) return;

    const actor = String(author || "");

    // أدمنات البوت أو البوت نفسه → تجاهل أفعالهم
    if (adminBot.includes(actor) || actor === botID) return;

    // ─── حالة 1: طرد أدمن بوت من القروب ─────────────────────
    if (logMessageType === "log:unsubscribe") {
      const leftID = String(
        logMessageData?.leftParticipantFbId ||
        logMessageData?.removedParticipants?.[0]?.userFbId || ""
      );

      // فقط أدمنات البوت — البوت نفسه محذوف من الحماية
      if (!leftID || !adminBot.includes(leftID)) return;

      await api.removeUserFromGroup(actor, threadID).catch(() => {});
      await new Promise(r => setTimeout(r, 1000));
      await api.addUserToGroup(leftID, threadID).catch(() => {});
      await new Promise(r => setTimeout(r, 1000));
      await api.changeAdminStatus(threadID, leftID, true).catch(() => {});
      return;
    }

    // ─── حالة 2: إزالة صلاحيات أدمن بوت ────────────────────
    if (logMessageType === "log:thread-admins") {
      if (logMessageData?.ADMIN_EVENT !== "remove_admin") return;

      const targetID = String(logMessageData?.TARGET_ID || "");

      // فقط أدمنات البوت — البوت نفسه محذوف من الحماية
      if (!adminBot.includes(targetID)) return;

      try {
        const info = await api.getThreadInfo(threadID);
        if (!info) return;

        const currentAdmins = (info.adminIDs || []).map(a => String(a.id || a));

        await api.changeAdminStatus(threadID, actor, false).catch(() => {});

        for (const id of currentAdmins) {
          if (id === actor)             continue;
          if (adminBot.includes(id))    continue;
          if (id === botID)             continue;
          await api.changeAdminStatus(threadID, id, false).catch(() => {});
          await new Promise(r => setTimeout(r, 300));
        }

        await api.changeAdminStatus(threadID, targetID, true).catch(() => {});
      } catch (e) {
        console.error("❌ protectOwner:", e.message);
      }
    }
  }
};
