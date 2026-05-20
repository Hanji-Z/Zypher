module.exports = {
  config: {
    name: "gid",
    aliases: ["groupid", "tid", "threadid"],
    version: "1.0",
    author: "ShAn",
    role: 0,
    countDown: 3,
    category: "info",
    shortDescription: "اعرض ID المجموعة الحالية أو قائمة كل المجموعات",
    guide: {
      en: "{pn}         — ID هذا القروب\n"
        + "{pn} list    — قائمة كل القروبات مع ID\n"
        + "{pn} @ذكر   — ID المستخدم المذكور"
    }
  },

  onStart: async function ({ api, event, args, message }) {
    const { threadID, mentions, senderID } = event;

    // ─── gid list — كل القروبات ───
    if (args[0]?.toLowerCase() === "list") {
      const adminBot = global.GoatBot?.config?.adminBot || [];
      if (!adminBot.includes(senderID.toString()))
        return message.reply("❌ هذا الأمر للمشرفين فقط.");

      const allThreads = global.db.allThreadData.filter(t => {
        if (t.isGroup === false) return false;
        if (typeof t.threadID === "string" && t.threadID.includes(":")) return false;
        return true;
      });

      if (!allThreads.length)
        return message.reply("❌ لا توجد مجموعات مسجلة.");

      const PAGE_SIZE = 15;
      const page = Math.max(1, parseInt(args[1]) || 1);
      const start = (page - 1) * PAGE_SIZE;
      const slice = allThreads.slice(start, start + PAGE_SIZE);
      const totalPages = Math.ceil(allThreads.length / PAGE_SIZE);

      const lines = slice.map((t, i) => {
        const name = t.threadName || t.data?.threadName || "بدون اسم";
        return `${start + i + 1}. ${name}\n    🆔 ${t.threadID}`;
      });

      let text = `📋 قائمة المجموعات (${allThreads.length} قروب):\n`
        + `━━━━━━━━━━━━━━━━━━━\n`
        + lines.join("\n\n");

      if (totalPages > 1)
        text += `\n━━━━━━━━━━━━━━━━━━━\n📄 صفحة ${page}/${totalPages}`;
      if (page < totalPages)
        text += ` | .gid list ${page + 1} للتالية`;

      return message.reply(text);
    }

    // ─── gid @ذكر — ID المستخدم المذكور ───
    if (mentions && Object.keys(mentions).length > 0) {
      const lines = Object.entries(mentions).map(([uid, name]) =>
        `👤 ${name}\n🆔 ${uid}`
      );
      return message.reply(
        `📌 معلومات المستخدمين:\n━━━━━━━━━━━━━━━━━━━\n` + lines.join("\n\n")
      );
    }

    // ─── gid — معلومات القروب الحالي ───
    let threadName = "غير معروف";
    try {
      const info = await api.getThreadInfo(threadID);
      threadName = info?.name || info?.threadName || "بدون اسم";
    } catch {}

    const isGroupText = event.isGroup ? "✅ مجموعة" : "💬 محادثة خاصة";

    return message.reply(
      `📌 معلومات هذا القروب:\n`
      + `━━━━━━━━━━━━━━━━━━━\n`
      + `🏷️ الاسم: ${threadName}\n`
      + `🆔 ID: ${threadID}\n`
      + `${isGroupText}\n\n`
      + `💡 ID حسابك: ${senderID}`
    );
  }
};
