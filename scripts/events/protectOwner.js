/*
  ╔══════════════════════════════════════════╗
  ║    PROTECT OWNER — v3.0                  ║
  ║  • طرد أدمن بوت → يكيك اللي طرده + يرجع ║
  ║  • طرد البوت نفسه → يكيك اللي طرده      ║
  ║  • إزالة صلاحيات → يشيل كل الأدمنات    ║
  ╚══════════════════════════════════════════╝
*/

module.exports = {
  config: {
    name: "protectOwner",
    version: "3.0",
    author: "ShAn",
    category: "events"
  },

  onStart: async ({ event, api }) => {
    const adminBot = (global.GoatBot?.config?.adminBot || []).map(String);
    const botID    = String(api.getCurrentUserID());

    // كل المحميين = أدمنات البوت + البوت نفسه
    const protected_ = [...new Set([...adminBot, botID])];

    const { threadID, logMessageType, logMessageData, author } = event;
    if (!logMessageType) return;

    const actor = String(author || "");

    // أدمنات البوت أو البوت نفسه → تجاهل أفعالهم
    if (protected_.includes(actor)) return;

    // ─── حالة 1: طرد شخص محمي من القروب ─────────────────────
    if (logMessageType === "log:unsubscribe") {
      const leftID = String(
        logMessageData?.leftParticipantFbId ||
        logMessageData?.removedParticipants?.[0]?.userFbId || ""
      );
      if (!leftID || !protected_.includes(leftID)) return;

      // 1) اكيك اللي طرده فوراً
      await api.removeUserFromGroup(actor, threadID).catch(() => {});

      // 2) إذا المطرود مش البوت نفسه → ضيفه راجع وعيّنه أدمن
      if (leftID !== botID) {
        await new Promise(r => setTimeout(r, 1000));
        await api.addUserToGroup(leftID, threadID).catch(() => {});
        await new Promise(r => setTimeout(r, 1000));
        await api.changeAdminStatus(threadID, leftID, true).catch(() => {});
      }
      // إذا البوت نفسه مطرود → ما نقدرش نضيفه راجع (Facebook API)
      // لكن الكيك تم ✅
      return;
    }

    // ─── حالة 2: إزالة صلاحيات شخص محمي أو البوت ──────────
    if (logMessageType === "log:thread-admins") {
      if (logMessageData?.ADMIN_EVENT !== "remove_admin") return;

      const targetID    = String(logMessageData?.TARGET_ID || "");
      const isProtected = protected_.includes(targetID);
      if (!isProtected) return;

      try {
        const info = await api.getThreadInfo(threadID);
        if (!info) return;

        const currentAdmins = (info.adminIDs || []).map(a => String(a.id || a));

        // أشيل صلاحيات اللي فعلها أولاً
        await api.changeAdminStatus(threadID, actor, false).catch(() => {});

        // أشيل باقي الأدمنات ما عدا المحميين
        for (const id of currentAdmins) {
          if (id === actor)          continue; // تم
          if (protected_.includes(id)) continue; // محمي
          await api.changeAdminStatus(threadID, id, false).catch(() => {});
          await new Promise(r => setTimeout(r, 300));
        }

        // أرجع الصلاحية للمحمي
        await api.changeAdminStatus(threadID, targetID, true).catch(() => {});
      } catch (e) {
        console.error("❌ protectOwner admin-event:", e.message);
      }
    }
  }
};
