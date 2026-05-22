/*
  ╔══════════════════════════════════════════╗
  ║    PROTECT OWNER — v5.0                  ║
  ║  • mutex لكل قروب — يمنع التشابك        ║
  ║  • يحمي فقط adminBot (مش البوت نفسه)    ║
  ╚══════════════════════════════════════════╝
*/

// ─── قفل لكل قروب يمنع تنفيذين بالتوازي ───
const locks = new Map();

async function withLock(threadID, fn) {
  // انتظر لحتى القفل يُحرَّر
  while (locks.get(threadID)) {
    await new Promise(r => setTimeout(r, 200));
  }
  locks.set(threadID, true);
  try { await fn(); }
  finally { locks.delete(threadID); }
}

module.exports = {
  config: {
    name: "protectOwner",
    version: "5.0",
    author: "ShAn",
    category: "events"
  },

  onStart: async ({ event, api }) => {
    const adminBot = (global.GoatBot?.config?.adminBot || []).map(String);
    const botID    = String(api.getCurrentUserID());

    const { threadID, logMessageType, logMessageData, author } = event;
    if (!logMessageType) return;

    const actor = String(author || "");

    // actor فارغ أو محمي → تجاهل
    if (!actor || adminBot.includes(actor) || actor === botID) return;

    // ─── حالة 1: طرد أدمن بوت ─────────────────────────────
    if (logMessageType === "log:unsubscribe") {
      const leftID = String(
        logMessageData?.leftParticipantFbId ||
        logMessageData?.removedParticipants?.[0]?.userFbId || ""
      );
      if (!leftID || !adminBot.includes(leftID)) return;

      await withLock(threadID, async () => {
        // 1. اكيك اللي طرده
        await api.removeUserFromGroup(actor, threadID).catch(() => {});
        await new Promise(r => setTimeout(r, 1000));
        // 2. أضف المطرود راجع
        await api.addUserToGroup(leftID, threadID).catch(() => {});
        await new Promise(r => setTimeout(r, 1000));
        // 3. عيّنه أدمن
        await api.changeAdminStatus(threadID, leftID, true).catch(() => {});
      });
      return;
    }

    // ─── حالة 2: إزالة صلاحيات أدمن بوت ─────────────────
    if (logMessageType === "log:thread-admins") {
      if (logMessageData?.ADMIN_EVENT !== "remove_admin") return;

      const targetID = String(logMessageData?.TARGET_ID || "");
      if (!targetID || !adminBot.includes(targetID)) return;

      await withLock(threadID, async () => {
        try {
          const info = await api.getThreadInfo(threadID);
          if (!info) return;

          // فقط الأدمنات الحاليين اللي ما هم محميين
          const currentAdmins = (info.adminIDs || [])
            .map(a => String(a.id || a))
            .filter(id =>
              id !== actor &&           // مش اللي فعلها (راه تم)
              !adminBot.includes(id) && // مش محمي
              id !== botID              // مش البوت
            );

          // أشيل صلاحيات اللي فعلها
          await api.changeAdminStatus(threadID, actor, false).catch(() => {});

          // أشيل باقي الأدمنات غير المحميين
          for (const id of currentAdmins) {
            await api.changeAdminStatus(threadID, id, false).catch(() => {});
            await new Promise(r => setTimeout(r, 300));
          }

          // أرجع الصلاحية للمحمي
          await api.changeAdminStatus(threadID, targetID, true).catch(() => {});
        } catch (e) {
          console.error("❌ protectOwner:", e.message);
        }
      });
    }
  }
};
