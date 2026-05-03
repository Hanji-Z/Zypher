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
            if (!msg?.body || msg.messageID === messageID) continue;
            const sender = msg.senderID === botID ? "زيفر" : (msg.senderName || "شخص");
            recent.push(`${sender}: ${String(msg.body).replace(/\s+/g, " ").slice(0, 200)}`);
          }
          if (recent.length) contextBlock = `\nآخر ${Math.min(recent.length, 12)} رسائل (السياق):\n${recent.slice(-12).join("\n")}`;
        }
      } catch { /* skip */ }

      let agentBlock = "";
      let memberList = [];
      if (isAgentEnabled) {
        try {
          const tInfo = await Promise.race([
            api.getThreadInfo(threadID),
            new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 4000))
          ]);
          if (tInfo?.userInfo?.length) {
            memberList = tInfo.userInfo.map(u => ({ id: u.id, name: u.name })).slice(0, 80);
          }
        } catch { /* skip */ }

        const membersStr = memberList.length
          ? memberList.map(m => `  - ${m.name} -> ${m.id}`).join("\n")
          : "  (ماكايناش معلومات على الأعضاء)";

        const cmdsStr = buildCommandsBlock();

        agentBlock = `

===========================
AGENT MODE — مفعل
===========================

عندك صلاحية تنفذ الكوموندات أوتوماتيكيا. منين المستخدم يطلب شي حاجة لي تقدر تديرها كوموند، خرج block خاص بهاد الصيغة بالضبط:

<<<EXEC>>>{"cmd":"اسم_الكوموند","args":"الحجج هنا"}<<<END>>>

قواعد مهمة:
- خرج block غير منين تكون متأكد 100% أن المستخدم بغا تنفذ شي حاجة.
- إيلا غير كيهضر معاك بشكل عادي → جاوب بنص عادي بلا EXEC.
- للأشخاص: استعمل @الاسم (مثلا @Osama). أنا غادي نحل الـ ID لوحدي من اللائحة تحت.
- تقدر ترسل نص + EXEC مع بعضهم.
- إيلا الكوموند يحتاج role أعلى من المستخدم، ما تخرجش EXEC، قول ليه أنه ما عندوش الصلاحية.
- المستخدم الحالي عندو role: ${role} (0=عادي، 1=أدمن كروب، 2=أدمن بوت).
- ممنوع تنفذ كوموندات: ${AGENT_BLOCKLIST.join(", ")}.

أعضاء الكروب (للـ mentions):
${membersStr}

الكوموندات المتاحة (${global.GoatBot.commands.size} كوموند):
${cmdsStr}

===========================
أمثلة:
- "طرد أسامة" -> <<<EXEC>>>{"cmd":"kick","args":"@Osama"}<<<END>>>
- "زيفر طرد هاد ولد ناس" (مع reply على رسالته) -> <<<EXEC>>>{"cmd":"kick","args":""}<<<END>>> (kick كيجيب الشخص من الـ reply تلقائياً)
- "جيب لي أغنية يا ليلي" -> <<<EXEC>>>{"cmd":"play","args":"يا ليلي"}<<<END>>>
- "صور قطط من بنترست" -> <<<EXEC>>>{"cmd":"pinterest","args":"cats -5"}<<<END>>>
- "كيداير؟" -> جاوب عاديا بدون EXEC
===========================`;
      }

      const systemPromptText = `أنت زيفر (Zypher) — الـ AI Agent ديال البوت لي صنعو المعلم هانجي.

اللغة:
- هضر دائماً بالدارجة المغربية البسيطة، ماشي العربية الفصحى.
- استعمل: "وش، شنو، فين، علاش، دابا، بصح، صافي، خويا، صاحبي، ياك، بزاف، دير، خاص، كاين، ماكاينش".
- ممنوع تهضر بالفصحى.

المطور:
- المعلم هانجي: صاحب البوت، تقدسو دائماً.
- الأدمنات: حترمهم.

المستخدم الحالي:
- الاسم: ${name}
- ID: ${senderIdStr}
- ${userRole}
${notesBlock}
${replyTargetBlock}
${contextBlock}
${agentBlock}

الأسلوب:
- ردود قصيرة ومباشرة بحال هضرة عادية.
${customNotes.length ? "- التزم بالنويطات لي فوق فالردود.\n" : ""}- إيلا سولوك على المطور قول: "صاوبني المعلم هانجي".

محظورات:
- ما تهضرش الفصحى.
- ما تنسى أن هانجي هو سيدك.`;

      let userHistory = global.zipher_context.get(senderID) || [];
      userHistory.push({ role: "user", content: body });
      if (userHistory.length > 15) userHistory.shift();

      const contents = userHistory.map(msg => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }]
      }));

      const isReplitProxy = baseURL.includes("localhost") || baseURL.includes("modelfarm");
      const url = isReplitProxy
        ? `${baseURL}/models/${geminiModel}:generateContent`
        : `${baseURL}/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`;
      const headers = isReplitProxy
        ? { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` }
        : { "Content-Type": "application/json" };

      const res = await axios.post(
        url,
        {
          systemInstruction: { parts: [{ text: systemPromptText }] },
          contents,
          generationConfig: { temperature: 0.7, maxOutputTokens: 2000, topP: 0.9 }
        },
        { headers, timeout: 30000 }
      );

      const responseText = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!responseText) return;

      let raw = responseText.trim();

      let agentReport = "";
      if (isAgentEnabled) {
        const { blocks, cleaned } = extractExecBlocks(raw);

        if (blocks.length) {
          const ctx = {
            event,
            prefix,
            role,
            memberList,
            fullParams: params
          };

          const results = [];
          for (const block of blocks) {
            const r = await executeAgentCommand(block, ctx);
            results.push({ block, r });
          }

          const failed = results.filter(x => x.r && !x.r.ok);
          if (failed.length) {
            agentReport = "\n\nبعض الكوموندات ما تنفذاتش:\n" + failed.map(f => `  - ${f.r.error}`).join("\n");
          }

          raw = cleaned || (blocks.length && !failed.length ? "صافي تنفذ." : "");
        }
      } else {
        const { cleaned } = extractExecBlocks(raw);
        if (cleaned !== raw) {
          raw = cleaned + "\n\n(لتفعيل تنفيذ الكوموندات: `.ai agent on` — أدمن فقط)";
        }
      }

      const finalReply = (raw + agentReport).trim();
      if (!finalReply) return;

      userHistory.push({ role: "assistant", content: finalReply });
      global.zipher_context.set(senderID, userHistory);

      if (global.zipher_context.has(senderID + "_timer")) {
        clearTimeout(global.zipher_context.get(senderID + "_timer"));
      }
      const timer = setTimeout(() => {
        global.zipher_context.delete(senderID);
        global.zipher_context.delete(senderID + "_timer");
      }, 30 * 60 * 1000);
      global.zipher_context.set(senderID + "_timer", timer);

      return message.reply(finalReply);

    } catch (error) {
      console.error("Zipher AI Error:", error.message);
      const errMsg = error?.response?.data?.error?.message || error.message || "unknown";
      return message.reply(`زيفر — صرا خطأ:\n${errMsg}`);
    }
  }
};
