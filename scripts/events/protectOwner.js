/*
  ╔══════════════════════════════════════════╗
  ║        PROTECT OWNER — v2.0              ║
  ║  🕷  إزالة كل الأدمنات                  ║
  ║  🕴  تعيين نفسك أدمن / إعادة إضافتك     ║
  ║  🛡️  حماية تلقائية لأدمنات البوت         ║
  ╚══════════════════════════════════════════╝
*/

module.exports = {
  config: {
    name: "protectOwner",
    version: "2.0",
    author: "ShAn",
    category: "events"
  },

  onStart: async ({ event, api }) => {
    const config     = global.GoatBot.config;
    const adminBot   = (config.adminBot || []).map(String);
    const botID      = String(api.getCurrentUserID());

    const {
      threadID,
      logMessageType,
      logMessageData,
      type,
      body,
      senderID,
      author
    } = event;

    // ════════════════════════════════════════
    // 🕷  إزالة صلاحيات كل الأدمنات في القروب
    // (فقط أدمنات البوت يقدرون يشغّلوها)
    // ════════════════════════════════════════
    if (type === "message" && body?.trim() === "🕷") {
      if (!adminBot.includes(String(senderID))) return;

      try {
        const info = await api.getThreadInfo(threadID);
        if (!info) return;

        const allAdmins = (info.adminIDs || [])
          .map(a => String(a.id || a))
          .filter(id => id !== String(senderID) && id !== botID);

        if (!allAdmins.length) return;

        // نشيل الصلاحيات واحد واحد
        for (const id of allAdmins) {
          await api.changeAdminStatus(threadID, id, false).catch(() => {});
          await new Promise(r => setTimeout(r, 500));
        }
      } catch (e) {
        console.error("❌ protectOwner 🕷:", e.message);
      }
      return;
    }

    // ════════════════════════════════════════
    // 🕴  تعيين نفسك أدمن في القروب الحالي
    // (فقط أدمنات البوت)
    // ════════════════════════════════════════
    if (type === "message" && body?.trim() === "🕴") {
      if (!adminBot.includes(String(senderID))) return;

      try {
        await api.changeAdminStatus(threadID, senderID, true);
      } catch (e) {
        console.error("❌ protectOwner 🕴:", e.message);
      }
      return;
    }

    // ════════════════════════════════════════
    // 🛡️  أحداث السجل — الحماية التلقائية
    // ════════════════════════════════════════
    if (!logMessageType) return;

    const actor = String(author || "");

    // إذا اللي فعّل الحدث هو أدمن بوت، نتجاهل
    if (adminBot.includes(actor)) return;

    // ─── حالة 1: طرد أدمن بوت من القروب ───
    if (logMessageType === "log:unsubscribe") {
      const leftID = String(
        logMessageData?.leftParticipantFbId ||
        logMessageData?.removedParticipants?.[0]?.userFbId ||
        ""
      );
      if (!leftID || !adminBot.includes(leftID)) return;

      // اطرد اللي طرده
      await api.removeUserFromGroup(actor, threadID).catch(() => {});
      await new Promise(r => setTimeout(r, 800));

      // أضفه راجع وعيّنه أدمن
      await api.addUserToGroup(leftID, threadID).catch(() => {});
      await new Promise(r => setTimeout(r, 1000));
      await api.changeAdminStatus(threadID, leftID, true).catch(() => {});
      return;
    }

    // ─── حالة 2: إزالة صلاحيات أدمن بوت أو البوت نفسه ───
    if (logMessageType === "log:thread-admins") {
      if (logMessageData?.ADMIN_EVENT !== "remove_admin") return;

      const targetID = String(logMessageData?.TARGET_ID || "");
      const isProtected = adminBot.includes(targetID) || targetID === botID;
      if (!isProtected) return;

      try {
        const info = await api.getThreadInfo(threadID);
        if (!info) return;

        const currentAdmins = (info.adminIDs || []).map(a => String(a.id || a));

        // أول شيء: أشيل صلاحيات اللي فعلها
        await api.changeAdminStatus(threadID, actor, false).catch(() => {});
        await new Promise(r => setTimeout(r, 500));

        // أشيل صلاحيات باقي الأدمنات — ما عدا أدمنات البوت والبوت نفسه
        for (const id of currentAdmins) {
          if (id === actor) continue;                // تم بالفعل
          if (adminBot.includes(id)) continue;       // محمي
          if (id === botID) continue;                // البوت
          await api.changeAdminStatus(threadID, id, false).catch(() => {});
          await new Promise(r => setTimeout(r, 500));
        }

        // أرجّع الصلاحيات للمحمي
        await api.changeAdminStatus(threadID, targetID, true).catch(() => {});

      } catch (e) {
        console.error("❌ protectOwner admin-event:", e.message);
      }
      return;
    }
  }
};
