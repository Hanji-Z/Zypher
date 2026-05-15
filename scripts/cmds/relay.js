module.exports = {
  config: {
    name: "relay",
    aliases: ["crosscmd", "رلاي"],
    version: "1.0",
    author: "ShAn",
    countDown: 3,
    role: 2,
    category: "system",
    shortDescription: { en: "Run a command in another group" },
    guide: {
      en: "{pn} <groupID> <command> [args]\n"
        + "Example: {pn} 1234567890 weather cairo\n"
        + "         {pn} list — show all groups the bot is in"
    }
  },

  onStart: async function ({ api, message, args, event, threadsData, usersData }) {
    const { commands, aliases } = global.GoatBot;
    const { getPrefix } = global.utils;

    if (!args[0]) {
      return message.reply(
        "╔══════════════════════╗\n"
        + "║   📡  RELAY COMMAND  ║\n"
        + "╚══════════════════════╝\n\n"
        + "📌 الاستخدام:\n"
        + ".relay <ID المجموعة> <الأمر> [المعطيات]\n\n"
        + "📋 أمثلة:\n"
        + ".relay 1234567890 weather cairo\n"
        + ".relay 1234567890 balance\n\n"
        + "📂 لعرض قائمة المجموعات:\n"
        + ".relay list"
      );
    }

    if (args[0].toLowerCase() === "list") {
      const allThreads = global.db.allThreadData.filter(t => t.isGroup !== false);
      if (!allThreads.length) return message.reply("❌ لا توجد مجموعات مسجلة في قاعدة البيانات.");
      const lines = allThreads.map((t, i) =>
        `${i + 1}. ${t.threadName || "بدون اسم"}\n   🆔 ${t.threadID}`
      );
      return message.reply(
        "📋 قائمة المجموعات المتاحة:\n"
        + "━━━━━━━━━━━━━━━━━━━\n"
        + lines.join("\n\n")
      );
    }

    const targetThreadID = args[0];
    const commandInput   = args[1]?.toLowerCase();
    const cmdArgs        = args.slice(2);

    if (!targetThreadID || isNaN(targetThreadID))
      return message.reply("❌ يجب أن يكون ID المجموعة رقماً صحيحاً.");

    if (!commandInput)
      return message.reply("❌ يجب تحديد اسم الأمر.\nمثال: .relay " + targetThreadID + " weather cairo");

    const command = commands.get(commandInput) || commands.get(aliases.get(commandInput));
    if (!command)
      return message.reply(`❌ الأمر "${commandInput}" غير موجود.`);

    const targetThread = global.db.allThreadData.find(t => t.threadID == targetThreadID);
    if (!targetThread)
      return message.reply(`❌ المجموعة ${targetThreadID} غير موجودة في قاعدة البيانات.\nتأكد أن البوت موجود فيها وأرسل أمراً فيها أولاً.`);

    const senderID   = event.senderID;
    const prefix     = getPrefix(targetThreadID);
    const langCode   = targetThread.data?.lang || global.GoatBot.config.language || "en";

    const fakeEvent = {
      ...event,
      threadID:     targetThreadID,
      body:         prefix + commandInput + (cmdArgs.length ? " " + cmdArgs.join(" ") : ""),
      isGroup:      true,
      senderID:     senderID
    };

    const createFuncMessage = global.utils.message;
    const fakeMessage = createFuncMessage(api, fakeEvent);

    let targetThreadData;
    try {
      targetThreadData = await threadsData.get(targetThreadID);
    } catch (e) {
      return message.reply("❌ تعذّر جلب بيانات المجموعة الهدف.");
    }

    let senderUserData;
    try {
      senderUserData = await usersData.get(senderID);
    } catch (e) {
      senderUserData = null;
    }

    const role = (() => {
      if (global.GoatBot.config.adminBot.includes(senderID)) return 2;
      if ((targetThreadData.adminIDs || []).includes(senderID)) return 1;
      return 0;
    })();

    const parameters = {
      api,
      message:      fakeMessage,
      event:        fakeEvent,
      args:         cmdArgs,
      commandName:  command.config.name,
      prefix,
      role,
      langCode,
      threadsData,
      usersData,
      threadModel:  global.db.threadModel,
      userModel:    global.db.userModel,
      envCommands:  global.GoatBot.configCommands.envCommands || {},
      envEvents:    global.GoatBot.configCommands.envEvents   || {},
      envGlobal:    global.GoatBot.configCommands.envGlobal   || {},
      getLang: (key, ...a) => {
        let lang = command.langs?.[langCode]?.[key] || "";
        for (let i = a.length - 1; i >= 0; i--)
          lang = lang.replace(new RegExp(`%${i + 1}`, "g"), a[i]);
        return lang || `❌ Key "${key}" not found`;
      }
    };

    message.reply(
      `📡 جارٍ تنفيذ الأمر "${command.config.name}" في المجموعة:\n`
      + `🏷️ ${targetThread.threadName || "بدون اسم"}\n`
      + `🆔 ${targetThreadID}`
    );

    try {
      await command.onStart(parameters);
    } catch (err) {
      return message.reply(`❌ حدث خطأ أثناء تنفيذ الأمر:\n${err.message || err}`);
    }
  }
};
