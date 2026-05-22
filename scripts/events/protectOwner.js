/*
  ╔══════════════════════════════════════════╗
  ║    PROTECT OWNER — v2.1 (events only)    ║
  ║  🛡️  حماية تلقائية لأدمنات البوت         ║
  ║  • طرد أدمن بوت → يرجع + يكيك اللي طرده ║
  ║  • إزالة صلاحياته → يشيل كل الأدمنات    ║
  ╚══════════════════════════════════════════╝
*/

module.exports = {
  config: {
    name: "protectOwner",
    version: "2.1",
    author: "ShAn",
    category: "events"
  },

  onStart: async ({ event, api }) => {
    const adminBot = (global.GoatBot.config.adminBot || []).map(String);
    const botID    = String(api.getCurrentUserID());

    const { threadID, logMessageType, logMessageData, author } = event;

    // ملفات الأحداث تُنادى فقط عند type:"event" — نتجاهل أي شيء بدون logMessageType
    if (!logMessageType) return;

    const actor = String(author || "");

    // إذا اللي فعّل الحدث هو أدمن بوت → تجاهل (أدمنات البوت ما يحاربوا بعض)
    if (adminBot.includes(actor)) return;

    // ─── حالة 1: طرد أدمن بوت من القروب ───────────────────
    if (logMessageType === "log:unsubscribe") {
      const leftID = String(
        logMessageData?.leftParticipantFbId ||
        logMessageData?.removedParticipants?.[0]?.userFbId || ""
      );
      if (!leftID || !adminBot.includes(leftID)) return;

      // اكيك اللي طرده
      await api.removeUserFromGroup(actor, threadID).catch(() => {});
      await new Promise(r => setTimeout(r, 800));
      // أضف المطرود راجع وعيّنه أدمن
      await api.addUserToGroup(leftID, threadID).catch(() => {});
      await new Promise(r => setTimeout(r, 1000));
      await api.changeAdminStatus(threadID, leftID, true).catch(() => {});
      return;
    }

    // ─── حالة 2: إزالة صلاحيات أدمن بوت أو البوت نفسه ────
    if (logMessageType === "log:thread-admins") {
      if (logMessageData?.ADMIN_EVENT !== "remove_admin") return;

      const targetID   = String(logMessageData?.TARGET_ID || "");
      const isProtected = adminBot.includes(targetID) || targetID === botID;
      if (!isProtected) return;

      try {
        const info = await api.getThreadInfo(threadID);
        if (!info) return;

        const currentAdmins = (info.adminIDs || []).map(a => String(a.id || a));

        // أشيل صلاحيات اللي فعلها أولاً
        await api.changeAdminStatus(threadID, actor, false).catch(() => {});
        await new Promise(r => setTimeout(r, 500));

        // أشيل باقي الأدمنات ما عدا أدمنات البوت والبوت نفسه
        for (const id of currentAdmins) {
          if (id === actor)             continue; // تم
          if (adminBot.includes(id))    continue; // محمي
          if (id === botID)             continue; // البوت
          await api.changeAdminStatus(threadID, id, false).catch(() => {});
          await new Promise(r => setTimeout(r, 500));
        }

        // أرجع الصلاحية للمحمي
        await api.changeAdminStatus(threadID, targetID, true).catch(() => {});
      } catch (e) {
        console.error("❌ protectOwner admin-event:", e.message);
      }
    }
  }
};
