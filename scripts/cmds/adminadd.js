const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "admins",
    aliases: ["a"],
    version: "1.3",
    author: "ShAn & Hanji",
    countDown: 5,
    role: 2,
    category: "SYSTEM",
    shortDescription: "إضافة أو إزالة أدمن من البوت",
    guide: {
      en: "{pn} add <uid | @tag | رد>    — إضافة أدمن\n"
        + "{pn} remove <uid | @tag | رد> — إزالة أدمن\n"
        + "{pn} list                      — عرض القائمة"
    }
  },

  langs: {
    en: {
      added:         "✅ تمت الإضافة (%1 مستخدم):\n%2",
      alreadyAdmin:  "⚠️ موجودين مسبقاً (%1):\n%2",
      removed:       "✅ تمت الإزالة (%1 مستخدم):\n%2",
      notAdmin:      "⚠️ ليسوا أدمن (%1):\n%2",
      missingId:     "⚠️ حدد ID أو @tag أو ارد على رسالة.",
      noAdmins:      "⚠️ لا يوجد أدمن في القائمة."
    }
  },

  onStart: async function ({ message, args, usersData, event, getLang }) {
    const sub = args[0]?.toLowerCase();

    // ─── تحديد مسار config.json ───
    const configPath = global.client?.dirConfig
      || path.join(process.cwd(), "config.json");

    const config = global.GoatBot.config;

    // ─── جلب UIDs من mentions / reply / args ───
    function getUIDs() {
      const mentions = Object.keys(event.mentions || {});
      if (mentions.length > 0) return mentions.map(String);
      if (event.messageReply?.senderID) return [String(event.messageReply.senderID)];
      return args.slice(1).filter(a => /^\d{5,}$/.test(a)).map(String);
    }

    // ─── حفظ config ───
    function saveConfig() {
      try {
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      } catch (e) {
        console.error("❌ adminadd — failed to write config:", e.message);
      }
    }

    // ─── list ───
    if (!sub || sub === "list" || sub === "-l") {
      const admins = config.adminBot || [];
      if (!admins.length) return message.reply(getLang("noAdmins"));

      const names = await Promise.all(
        admins.map(uid => usersData.getName(uid).catch(() => uid))
      );
      const lines = admins.map((uid, i) => `• ${names[i]} (${uid})`).join("\n");
      return message.reply(`📋 قائمة الأدمن (${admins.length}):\n━━━━━━━━━━━━━\n${lines}`);
    }

    // ─── add ───
    if (sub === "add" || sub === "-a") {
      const uids = getUIDs();
      if (!uids.length) return message.reply(getLang("missingId"));

      const added = [], already = [];
      for (const uid of uids) {
        if (config.adminBot.map(String).includes(uid)) already.push(uid);
        else { config.adminBot.push(uid); added.push(uid); }
      }

      if (added.length) saveConfig();

      const addedNames  = await Promise.all(added.map(u  => usersData.getName(u).catch(() => u)));
      const alreadyNames = await Promise.all(already.map(u => usersData.getName(u).catch(() => u)));

      let reply = "";
      if (added.length)   reply += getLang("added",        added.length,   addedNames.map(n  => `• ${n}`).join("\n"));
      if (already.length) reply += (reply ? "\n" : "") + getLang("alreadyAdmin", already.length, alreadyNames.map(n => `• ${n}`).join("\n"));
      return message.reply(reply);
    }

    // ─── remove ───
    if (sub === "remove" || sub === "-r") {
      const uids = getUIDs();
      if (!uids.length) return message.reply(getLang("missingId"));

      const removed = [], notAdmin = [];
      for (const uid of uids) {
        const idx = config.adminBot.map(String).indexOf(uid);
        if (idx !== -1) { config.adminBot.splice(idx, 1); removed.push(uid); }
        else notAdmin.push(uid);
      }

      if (removed.length) saveConfig();

      const removedNames  = await Promise.all(removed.map(u  => usersData.getName(u).catch(() => u)));
      const notAdminNames = await Promise.all(notAdmin.map(u => usersData.getName(u).catch(() => u)));

      let reply = "";
      if (removed.length)  reply += getLang("removed",  removed.length,  removedNames.map(n  => `• ${n}`).join("\n"));
      if (notAdmin.length) reply += (reply ? "\n" : "") + getLang("notAdmin", notAdmin.length, notAdminNames.map(n => `• ${n}`).join("\n"));
      return message.reply(reply);
    }

    return message.reply("⚠️ استخدم: add | remove | list");
  }
};
