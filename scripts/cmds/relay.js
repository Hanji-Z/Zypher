module.exports = {
  config: {
    name: "relay",
    aliases: ["crosscmd", "رلاي"],
    version: "2.0",
    author: "ShAn",
    countDown: 3,
    role: 2,
    category: "system",
    shortDescription: { en: "Run a command in another group interactively" },
    guide: {
      en: "{pn} list [صفحة]   — اختر قروب بشكل تفاعلي\n"
        + "{pn} <ID> <أمر>    — تنفيذ مباشر"
    }
  },

  onStart: async function ({ api, message, args, event, threadsData, usersData }) {
    const { senderID } = event;

    if (!args[0]) {
      return message.reply(
        "╔══════════════════════╗\n"
        + "║   📡  RELAY COMMAND  ║\n"
        + "╚══════════════════════╝\n\n"
        + "📌 الاستخدام:\n"
        + ".relay list — اختيار قروب بشكل تفاعلي\n"
        + ".relay <ID> <الأمر> [المعطيات] — تنفيذ مباشر\n\n"
        + "📋 مثال:\n"
        + ".relay 1234567890 nam under del"
      );
    }

    if (args[0].toLowerCase() === "list") {
      const allThreads = global.db.allThreadData.filter(t => t.isGroup !== false);
      if (!allThreads.length)
        return message.reply("❌ لا توجد مجموعات مسجلة في قاعدة البيانات.");

      const page = Math.max(1, parseInt(args[1]) || 1);
      const start = (page - 1) * 10;
      const slice = allThreads.slice(start, start + 10);
      const totalPages = Math.ceil(allThreads.length / 10);

      if (!slice.length)
        return message.reply(`❌ لا توجد مجموعات في الصفحة ${page}.`);

      const lines = slice.map((t, i) =>
        `${start + i + 1}. ${t.threadName || "بدون اسم"}`
      );

      let text = "📋 قائمة المجموعات — اختر رقماً:\n"
        + "━━━━━━━━━━━━━━━━━━━\n"
        + lines.join("\n")
        + "\n━━━━━━━━━━━━━━━━━━━";

      if (totalPages > 1)
        text += `\nصفحة ${page}/${totalPages}`;
      if (page < totalPages)
        text += ` | .relay list ${page + 1} للتالية`;

      text += "\n\n↩️ ارد على هذه الرسالة برقم المجموعة";

      const sent = await message.reply(text);
      if (!sent?.messageID) return;

      global.GoatBot.onReply.set(sent.messageID, {
        commandName: "relay",
        author: senderID,
        type: "selectGroup",
        groups: slice,
        startIndex: start
      });
      return;
    }

    // ─── تنفيذ مباشر ───
    const targetThreadID = args[0];
    const commandInput   = args[1]?.toLowerCase();
    const cmdArgs        = args.slice(2);

    if (!targetThreadID || isNaN(targetThreadID))
      return message.reply("❌ ID المجموعة يجب أن يكون رقماً.");

    if (!commandInput)
      return message.reply("❌ يجب تحديد اسم الأمر.");

    return executeInThread({ api, message, event, threadsData, usersData, targetThreadID, commandInput, cmdArgs });
  },

  onReply: async function ({ api, message, event, Reply, threadsData, usersData }) {
    const { senderID, body } = event;
    if (!body) return;
    if (Reply.author !== senderID) return;

    // ─── المرحلة 1: اختيار رقم المجموعة ───
    if (Reply.type === "selectGroup") {
      const num = parseInt(body.trim());
      if (isNaN(num) || num < 1) {
        const sent = await message.reply("❌ ارد برقم صحيح من القائمة.");
        if (!sent?.messageID) return;
        global.GoatBot.onReply.set(sent.messageID, { ...Reply });
        return;
      }

      const localIndex = num - 1 - Reply.startIndex;
      if (localIndex < 0 || localIndex >= Reply.groups.length) {
        const sent = await message.reply(`❌ الرقم ${num} غير موجود في هذه الصفحة.`);
        if (!sent?.messageID) return;
        global.GoatBot.onReply.set(sent.messageID, { ...Reply });
        return;
      }

      const selectedGroup = Reply.groups[localIndex];

      const sent = await message.reply(
        `✅ تم اختيار المجموعة:\n`
        + `🏷️ ${selectedGroup.threadName || "بدون اسم"}\n`
        + `🆔 ${selectedGroup.threadID}\n\n`
        + `↩️ ارد بالأمر الذي تريد تشغيله\n`
        + `مثال: .nam under del`
      );
      if (!sent?.messageID) return;

      global.GoatBot.onReply.set(sent.messageID, {
        commandName: "relay",
        author: senderID,
        type: "selectCommand",
        targetThreadID: selectedGroup.threadID,
        targetThreadName: selectedGroup.threadName || "بدون اسم"
      });
      return;
    }

    // ─── المرحلة 2: استقبال الأمر وتنفيذه ───
    if (Reply.type === "selectCommand") {
      const { targetThreadID, targetThreadName } = Reply;
      const prefix = global.utils.getPrefix(event.threadID);

      let rawInput = body.trim();
      if (rawInput.startsWith(prefix)) rawInput = rawInput.slice(prefix.length).trim();

      const parts = rawInput.split(/ +/);
      const commandInput = parts[0]?.toLowerCase();
      const cmdArgs      = parts.slice(1);

      if (!commandInput)
        return message.reply("❌ لم يتم إدخال أمر. ارد مرة أخرى.");

      return executeInThread({
        api, message, event, threadsData, usersData,
        targetThreadID, commandInput, cmdArgs
      });
    }
  }
};

async function executeInThread({ api, message, event, threadsData, usersData, targetThreadID, commandInput, cmdArgs }) {
  const { commands, aliases } = global.GoatBot;
  const { getPrefix } = global.utils;
  const { senderID } = event;

  const command = commands.get(commandInput) || commands.get(aliases.get(commandInput));
  if (!command)
    return message.reply(`❌ الأمر "${commandInput}" غير موجود.`);

  const targetThread = global.db.allThreadData.find(t => t.threadID == targetThreadID);
  if (!targetThread)
    return message.reply(`❌ المجموعة ${targetThreadID} غير موجودة في قاعدة البيانات.`);

  const prefix   = getPrefix(targetThreadID);
  const langCode = targetThread.data?.lang || global.GoatBot.config.language || "en";

  const fakeEvent = {
    ...event,
    threadID: targetThreadID,
    body: prefix + commandInput + (cmdArgs.length ? " " + cmdArgs.join(" ") : ""),
    isGroup: true,
    senderID
  };

  const fakeMessage = global.utils.message(api, fakeEvent);

  let targetThreadData;
  try {
    targetThreadData = await threadsData.get(targetThreadID);
  } catch (e) {
    return message.reply("❌ تعذّر جلب بيانات المجموعة الهدف.");
  }

  const role = (() => {
    if (global.GoatBot.config.adminBot.includes(senderID)) return 2;
    if ((targetThreadData.adminIDs || []).includes(senderID)) return 1;
    return 0;
  })();

  const parameters = {
    api,
    message:     fakeMessage,
    event:       fakeEvent,
    args:        cmdArgs,
    commandName: command.config.name,
    prefix,
    role,
    langCode,
    threadsData,
    usersData,
    threadModel: global.db.threadModel,
    userModel:   global.db.userModel,
    envCommands: global.GoatBot.configCommands.envCommands || {},
    envEvents:   global.GoatBot.configCommands.envEvents   || {},
    envGlobal:   global.GoatBot.configCommands.envGlobal   || {},
    getLang: (key, ...a) => {
      let lang = command.langs?.[langCode]?.[key] || "";
      for (let i = a.length - 1; i >= 0; i--)
        lang = lang.replace(new RegExp(`%${i + 1}`, "g"), a[i]);
      return lang || `❌ Key "${key}" not found`;
    }
  };

  await message.reply(
    `📡 تنفيذ الأمر "${command.config.name}" في:\n`
    + `🏷️ ${targetThread.threadName || targetThreadID}`
  );

  try {
    await command.onStart(parameters);
  } catch (err) {
    return message.reply(`❌ خطأ: ${err.message || err}`);
  }
}
