/*
  ╔══════════════════════════════════════════╗
  ║    PROTECT OWNER — v6.0                  ║
  ║  • طرد أدمن بوت → كيك + يرجع           ║
  ║  • إزالة ادمن بوت → كيك المعتدي         ║
  ║  • mutex لكل قروب                        ║
  ╚══════════════════════════════════════════╝
*/

const locks = new Map();

async function withLock(threadID, fn) {
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
    version: "6.0",
    author: "ShAn",
    category: "events"
  },

  onStart: async ({ event, api }) => {
    const adminBot = (global.GoatBot?.config?.adminBot || []).map(String);
    const botID    = String(api.getCurrentUserID());

    const { threadID, logMessageType, logMessageData, author } = event;
    if (!logMessageType) return;

    const actor = String(author || "");
    if (!actor || actor === botID) return;

    // ─── حالة 1: طرد / خروج أدمن بوت ────────────────────────
    if (logMessageType === "log:unsubscribe") {
      const leftID = String(
        logMessageData?.leftParticipantFbId ||
        logMessageData?.removedParticipants?.[0]?.userFbId || ""
      );
      if (!leftID || !adminBot.includes(leftID)) return;

      const isVoluntary = actor === leftID;

      await withLock(threadID, async () => {
        // إذا طرده شخص آخر → كيك المعتدي أولاً
        if (!isVoluntary && !adminBot.includes(actor)) {
          await api.removeUserFromGroup(actor, threadID).catch(() => {});
          await new Promise(r => setTimeout(r, 1000));
        }
        // في الحالتين: أرجعو ودير أدمن
        await api.addUserToGroup(leftID, threadID).catch(() => {});
        await new Promise(r => setTimeout(r, 1000));
        await api.changeAdminStatus(threadID, leftID, true).catch(() => {});
      });
      return;
    }

    // ─── حالة 2: إزالة صلاحيات أدمن بوت ─────────────────
    if (logMessageType === "log:thread-admins") {

      // ─── log للديباغ: نشوف الحقول الفعلية في Railway ───
      console.log("[protectOwner] log:thread-admins data:", JSON.stringify(logMessageData));
      console.log("[protectOwner] actor:", actor);

      // Facebook يرسل untypedData بأسماء مختلفة — نجرب كلها
      const adminEvent = String(
        logMessageData?.ADMIN_EVENT ||
        logMessageData?.admin_event  ||
        logMessageData?.adminEvent   || ""
      ).toLowerCase();

      const targetID = String(
        logMessageData?.TARGET_ID   ||
        logMessageData?.target_id   ||
        logMessageData?.targetId    || ""
      );

      console.log("[protectOwner] adminEvent:", adminEvent, "| targetID:", targetID);

      if (adminEvent !== "remove_admin") return;
      if (!targetID || !adminBot.includes(targetID)) return;

      await withLock(threadID, async () => {
        try {
          // 1. كيك المعتدي مباشرة
          await api.removeUserFromGroup(actor, threadID).catch(() => {});
          await new Promise(r => setTimeout(r, 800));

          // 2. أرجع الصلاحية للمحمي
          await api.changeAdminStatus(threadID, targetID, true).catch(() => {});
        } catch (e) {
          console.error("❌ protectOwner log:thread-admins:", e.message);
        }
      });
    }
  }
};
