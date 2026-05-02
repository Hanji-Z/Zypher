const axios = require("axios");

// خزنة الذاكرة فـ الـ RAM
if (!global.zipher_context) global.zipher_context = new Map();

// 🚫 كوموندات ممنوعة على الـ AI Agent (حماية)
const AGENT_BLOCKLIST = [
  "eval", "cmd", "exec", "shell", "shutdown", "restart",
  "uninstall", "install", "update", "ai"
];

// 🗂️ بناء قائمة الأوامر المتاحة (cache)
function buildCommandsBlock() {
  if (global.zipher_commands_cache) return global.zipher_commands_cache;
  const all = Array.from(global.GoatBot?.commands?.values?.() || []);
  const lines = [];
  for (const cmd of all) {
    const c = cmd.config;
    if (!c?.name) continue;
    if (AGENT_BLOCKLIST.includes(c.name)) continue;
    const desc = (c.shortDescription?.en || c.description?.en || c.longDescription?.en || "").toString().slice(0, 100);
    const guide = (c.guide?.en || "").toString().slice(0, 100);
    const role = c.role || 0;
    const aliases = c.aliases?.length ? ` [${c.aliases.slice(0, 3).join(",")}]` : "";
    lines.push(`- ${c.name}${aliases} (role:${role}) — ${desc} | usage: ${guide}`);
  }
  global.zipher_commands_cache = lines.join("\n");
  return global.zipher_commands_cache;
}

// 🔍 استخراج blocks ديال EXEC من رد الـ AI
function extractExecBlocks(text) {
  const re = /<<<EXEC>>>([\s\S]*?)<<<END>>>/g;
  const blocks = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    try {
      const obj = JSON.parse(m[1].trim());
      if (obj && obj.cmd) blocks.push(obj);
    } catch { /* تجاهل */ }
  }
  const cleaned = text.replace(re, "").trim();
  return { blocks, cleaned };
}

// 🎯 حل @Name لـ userID حقيقي
function resolveMentionsInArgs(argsArr, memberList) {
  const mentions = {};
  for (let i = 0; i < argsArr.length; i++) {
    const tok = argsArr[i];
    if (!tok.startsWith("@")) continue;
    const query = tok.slice(1).toLowerCase().trim();
    if (!query) continue;
    let match =
      memberList.find(m => m.name.toLowerCase() === query) ||
      memberList.find(m => m.name.toLowerCase().startsWith(query)) ||
      memberList.find(m => m.name.toLowerCase().includes(query)) ||
      memberList.find(m => query.includes(m.name.toLowerCase().split(" ")[0]));
    if (match) {
      mentions[match.id] = `@${match.name}`;
      argsArr[i] = `@${match.name}`;
    }
  }
  return mentions;
}

// ⚡ تنفيذ كوموند برمجيا
async function executeAgentCommand(block, ctx) {
  const { cmd, args = "" } = block;
  const cmdLower = String(cmd).toLowerCase();

  if (AGENT_BLOCKLIST.includes(cmdLower)) {
    return { ok: false, error: `الكوموند "${cmd}" ممنوع على الـ AI Agent.` };
  }

  const command =
    global.GoatBot.commands.get(cmdLower) ||
    global.GoatBot.commands.get(global.GoatBot.aliases.get(cmdLower));

  if (!command) return { ok: false, error: `الكوموند "${cmd}" ماكاينش.` };

  const requiredRole = command.config.role || 0;
  if (requiredRole > ctx.role) {
    return { ok: false, error: `الكوموند "${command.config.name}" خاص بالأدمنات (role ${requiredRole}). نتا role ${ctx.role}.` };
  }

  const argsArr = String(args).trim() ? String(args).trim().split(/ +/) : [];
  const mentions = resolveMentionsInArgs(argsArr, ctx.memberList);

  const syntheticEvent = {
    ...ctx.event,
    body: `${ctx.prefix}${command.config.name} ${argsArr.join(" ")}`.trim(),
    mentions
  };

  const params = {
    ...ctx.fullParams,
    event: syntheticEvent,
    args: argsArr,
    commandName: command.config.name,
    getLang: () => ""
  };

  try {
    await command.onStart(params);
    return { ok: true, name: command.config.name };
  } catch (err) {
    console.error("Agent exec error:", err);
    return { ok: false, error: `خطأ فالتنفيذ: ${err.message}` };
  }
}

module.exports = {
  config: {
    name: "ai3",
    aliases: ["chat3", "3زيفر"],
    version: "11.0.1",
    author: "Hanji & Zypher (Gemini Agent + Memory + Notes)",
    countDown: 3,
    role: 0,
    description: { en: "Zypher AI Agent — chat + auto-execute commands by intent" },
    category: "AI",
    guide: { en: "{pn} on | off | agent on/off | note <نص> | notes | forget <رقم>" }
  },

  onStart: async function ({ message, event, args, threadsData }) {
    const { threadID, senderID } = event;
    const sub = args[0]?.toLowerCase();

    const adminBot = (global.GoatBot?.config?.adminBot) || [];
    const isAdmin = adminBot.map(String).includes(String(senderID));

    if (sub === "on" || sub === "off") {
      await threadsData.set(threadID, sub === "on", "data.aiEnabled");
      return message.reply(`[ ZYPHER - CHAT ]\n❯ الحالة: ${sub === "on" ? "خدام دابا" : "متوقف"}`);
    }

    if (sub === "agent") {
      if (!isAdmin) return message.reply("تفعيل الـ Agent خاص الأدمنات فقط.");
      const v = args[1]?.toLowerCase();
      if (v !== "on" && v !== "off") return message.reply("استعمل: `.ai agent on` ولا `.ai agent off`");
      await threadsData.set(threadID, v === "on", "data.aiAgentEnabled");
      return;
    }

    if (sub === "note") {
      if (!isAdmin) return message.reply("النويطات خاصة بالأدمنات فقط.");
      const noteText = args.slice(1).join(" ").trim();
      if (!noteText) return message.reply("كتب النوطة بعد `note`. مثال: `.ai note ناديني خويا`");
      const notes = (await threadsData.get(threadID, "data.aiNotes")) || [];
      if (notes.length >= 20) return message.reply("وصلتي للحد الأقصى (20). امسح وحدة بـ `.ai forget <رقم>`.");
      notes.push(noteText);
      await threadsData.set(threadID, notes, "data.aiNotes");
      return message.reply(`النوطة #${notes.length} محفوظة:\n"${noteText}"`);
    }

    if (sub === "notes") {
      const notes = (await threadsData.get(threadID, "data.aiNotes")) || [];
      if (!notes.length) return message.reply("ماكاينش حتى نوطة.");
      return message.reply(`نويطات الكروب (${notes.length}):\n\n${notes.map((n, i) => `${i + 1}. ${n}`).join("\n")}`);
    }

    if (sub === "forget") {
      if (!isAdmin) return message.reply("خاص الأدمنات فقط.");
      const idx = parseInt(args[1], 10) - 1;
      const notes = (await threadsData.get(threadID, "data.aiNotes")) || [];
      if (!notes.length) return message.reply("ماكاينش نويطات.");
      if (isNaN(idx) || idx < 0 || idx >= notes.length) return message.reply(`رقم غالط (1 - ${notes.length}).`);
      const removed = notes.splice(idx, 1);
      await threadsData.set(threadID, notes, "data.aiNotes");
      return message.reply(`تمسحات:\n"${removed[0]}"`);
    }

    return message.reply(
      "زيفر — الـ AI Agent ديال البوت:\n\n" +
      "شات:\n" +
      "  • `.ai on` / `.ai off`\n\n" +
      "Agent (تنفيذ الكوموندات أوتو):\n" +
      "  • `.ai agent on` / `.ai agent off`  ← أدمن فقط\n\n" +
      "نويطات:\n" +
      "  • `.ai note <نص>` — أدمن فقط\n" +
      "  • `.ai notes`\n" +
      "  • `.ai forget <رقم>` — أدمن فقط\n\n" +
      "باش تهضر معاه: رد على شي رسالة ديالو."
    );
  },

  onChat: async function (params) {
    const { event, threadsData, api, message, usersData, prefix, role } = params;
    const { threadID, body, senderID, type, messageReply, messageID } = event;
    const botID = api.getCurrentUserID();

    const apiKey = process.env.AI_INTEGRATIONS_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    const baseURL = process.env.AI_INTEGRATIONS_GEMINI_BASE_URL || "https://generativelanguage.googleapis.com";
    const geminiModel = process.env.GEMINI_MODEL || "gemini-2.5-flash";

    if (senderID === botID || !body) return;

    const botNameMentioned = /زيفر|zypher/i.test(body);
    const isReplyToBot = type === "message_reply" && messageReply?.senderID === botID;

    if (!isReplyToBot && !botNameMentioned) return;

    console.log(`[ZIPHER] triggered | thread:${threadID} | body:"${body.slice(0,60)}"`);

    const isAiEnabled = await threadsData.get(threadID, "data.aiEnabled", false);
    console.log(`[ZIPHER] aiEnabled:${isAiEnabled} | botNameMentioned:${botNameMentioned}`);
    if (!isAiEnabled && !botNameMentioned) return;

    if (!apiKey) {
      return message.reply("زيفر ماخدامش — الـ API key ماكاينش.\nخاص الأدمن يحط المفتاح فالسيرفر.");
    }
    console.log(`[ZIPHER] calling Gemini | model:${geminiModel} | url:${baseURL.slice(0,40)}`);

    try {
      const name = await usersData.getName(senderID);
      const adminBot = (global.GoatBot?.config?.adminBot) || [];
      const senderIdStr = String(senderID);
      const isHanji = adminBot.length > 0 && senderIdStr === String(adminBot[0]);
      const isAdmin = adminBot.map(String).includes(senderIdStr);

      const isAgentEnabled = await threadsData.get(threadID, "data.aiAgentEnabled", false);

      let userRole;
      if (isHanji) userRole = `هذا هو المعلم هانجي بنفسه — صاحب البوت ومطورك. تقدسو دائماً، ناديه "سيدي هانجي" أو "المعلم".`;
      else if (isAdmin) userRole = `هذا واحد من أدمنات البوت. حترمو، ناديه "سيدي ${name}".`;
      else userRole = `مستخدم عادي اسمو ${name}. عاملو بحال صاحبك.`;

      const customNotes = (await threadsData.get(threadID, "data.aiNotes")) || [];
      const notesBlock = customNotes.length
        ? `\nنويطات خاصة بهاد الكروب:\n${customNotes.map((n, i) => `  ${i + 1}) ${n}`).join("\n")}`
        : "";

      // معلومات الشخص اللي ردّى عليه المستخدم (مو البوت)
      let replyTargetBlock = "";
      if (type === "message_reply" && messageReply && messageReply.senderID !== botID) {
        try {
          const targetName = await usersData.getName(messageReply.senderID);
          replyTargetBlock = `\nالمستخدم رد على رسالة هاد الشخص:\n- الاسم: ${targetName}\n- ID: ${messageReply.senderID}\n- إيلا طُلب منك تطرده أو تتفاعل معه → استعمل EXEC بدون args (kick كيتعامل مع الـ reply تلقائياً).`;
        } catch { /* skip */ }
      }

      let contextBlock = "";
      try {
        const history = await Promise.race([
          api.getThreadHistory(threadID, 15),
          new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 4000))
        ]);
        if (Array.isArray(history) && history.length > 0) {
          const recent = [];
          for (const msg of history) {
            if (!msg?.body || 
