/*
  ╔══════════════════════════════════════════════════╗
  ║        MASS REACT — v1.0                         ║
  ║  يعيط على كاع الصفحات ويدير تفاعل على بوست      ║
  ║  Usage: .massreact <link> <like|love|haha|wow>   ║
  ╚══════════════════════════════════════════════════╝
*/

const axios = require("axios");

// ── Map ديال التفاعلات ───────────────────────────
const REACTION_MAP = {
  like:  "LIKE",
  love:  "LOVE",
  haha:  "HAHA",
  wow:   "WOW",
  sad:   "SAD",
  angry: "ANGRY"
};

// ── delay عشوائي بين 5 و 15 ثانية ───────────────
function randomDelay() {
  const ms = Math.floor(Math.random() * 10000) + 5000;
  return new Promise(r => setTimeout(r, ms));
}

// ── استخراج fbid من الرابط ────────────────────────
function extractFBID(url) {
  const patterns = [
    /[?&]story_fbid=(\d+)/,
    /\/posts\/(\d+)/,
    /\/permalink\/(\d+)/,
    /\/photo(?:\.php)?.*fbid=(\d+)/,
    /\/reel\/(\d+)/,
    /\/videos?\/(\d+)/,
    /pfbid([\w]+)/,
    /\?v=(\d+)/,
    /\/(\d{15,})/
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

// ── استخراج الكوكيز كـ string من jar ─────────────
function getCookies(jar) {
  try {
    return jar.getCookies("https://www.facebook.com")
      .map(c => `${c.key}=${c.value}`)
      .join("; ");
  } catch { return ""; }
}

// ── جلب fb_dtsg من صفحة Facebook ─────────────────
async function getDTSG(cookieStr, userAgent) {
  const res = await axios.get("https://www.facebook.com/", {
    headers: {
      Cookie:        cookieStr,
      "User-Agent":  userAgent,
      "Accept-Language": "ar,en;q=0.9"
    },
    timeout: 10000,
    maxRedirects: 3
  });
  const m = res.data.match(/"DTSGInitialData",\[\],\{"token":"([^"]+)"/);
  if (!m) throw new Error("ما لقيناش fb_dtsg");
  return m[1];
}

// ── التفاعل على بوست ─────────────────────────────
async function reactToPost(jar, userAgent, userID, rawPostID, reactionType) {
  const cookieStr = getCookies(jar);
  const dtsg      = await getDTSG(cookieStr, userAgent);

  // feedback_id = base64("feedback:" + postID)
  const feedbackID = Buffer.from(`feedback:${rawPostID}`).toString("base64");

  const params = new URLSearchParams({
    fb_dtsg:                dtsg,
    fb_api_req_friendly_name: "CometUFIFeedbackReactMutation",
    variables: JSON.stringify({
      input: {
        feedback_id:       feedbackID,
        feedback_reaction: reactionType,
        feedback_source:   "OBJECT",
        actor_id:          userID,
        client_mutation_id: Math.random().toString(36).slice(2)
      },
      useDefaultActor: false,
      scale: 1
    }),
    doc_id: "6977595985599875",   // CometUFIFeedbackReactMutation
    server_timestamps: "true"
  });

  const res = await axios.post(
    "https://www.facebook.com/api/graphql/",
    params.toString(),
    {
      headers: {
        Cookie:        cookieStr,
        "User-Agent":  userAgent,
        "Content-Type": "application/x-www-form-urlencoded",
        Referer:       "https://www.facebook.com/"
      },
      timeout: 12000
    }
  );

  // تحقق من الرد
  const body = typeof res.data === "string" ? res.data : JSON.stringify(res.data);
  if (body.includes("error") && !body.includes("feedback_reaction")) {
    throw new Error("فيه مشكل في الرد: " + body.slice(0, 100));
  }
  return true;
}

// ════════════════════════════════════════════════════
module.exports = {
  config: {
    name: "massreact",
    version: "1.0",
    author: "ShAn",
    role: 2,                         // أونرات فقط
    countDown: 10,
    category: "owner",
    shortDescription: "تفاعل جماعي على بوست من كاع الصفحات",
    guide: { en: "{pn} <رابط> <like|love|haha|wow|sad|angry>" }
  },

  onStart: async function ({ api, event, args, message }) {
    const { threadID, messageID } = event;

    // ── التحقق من الـ arguments ──────────────────
    const link     = args[0] || "";
    const reactArg = (args[1] || "like").toLowerCase();

    if (!link.startsWith("http")) {
      return message.reply(
        "⚠️ استعمل الأمر هكدا:\n.massreact <رابط البوست> <like|love|haha|wow|sad|angry>"
      );
    }

    const reactionType = REACTION_MAP[reactArg];
    if (!reactionType) {
      return message.reply(
        `⚠️ التفاعل "${reactArg}" مش معروف.\nالتفاعلات المتاحة: like, love, haha, wow, sad, angry`
      );
    }

    const postID = extractFBID(link);
    if (!postID) {
      return message.reply("⚠️ ما قدرناش نستخرج ID ديال البوست من الرابط.");
    }

    // ── جلب الـ ctx من api ───────────────────────
    const jar       = api.ctx?.jar;
    const userAgent = api.ctx?.globalOptions?.userAgent || "Mozilla/5.0";
    const userID    = String(api.ctx?.userID || api.getCurrentUserID());

    if (!jar) {
      return message.reply("❌ ما لقيناش session cookies.");
    }

    // ── جلب الصفحات عبر getThreadList ────────────
    let threads = [];
    try {
      threads = await api.getThreadList(50, null, ["PAGE"]);
    } catch {
      // إذا ما خدمش ["PAGE"] نجربو INBOX
      try {
        threads = await api.getThreadList(50, null, ["INBOX"]);
      } catch (e2) {
        return message.reply("❌ فشل في جلب الصفحات: " + e2.message);
      }
    }

    if (!threads || !threads.length) {
      return message.reply("⚠️ ما لقينا شي صفحات.");
    }

    // ── رسالة البداية ─────────────────────────────
    const startMsg = await api.sendMessage(
      `🚀 بدينا MassReact\n📄 الصفحات: ${threads.length}\n💬 البوست: ${postID}\n❤️ التفاعل: ${reactionType}`,
      threadID
    );

    // ── Loop على الصفحات ──────────────────────────
    let success = 0;
    let failed  = 0;
    const errors = [];

    for (let i = 0; i < threads.length; i++) {
      const thread = threads[i];
      const label  = thread.name || thread.threadID || `صفحة ${i + 1}`;

      try {
        await reactToPost(jar, userAgent, userID, postID, reactionType);
        success++;
        console.log(`✅ [massreact] ${label} — ${reactionType}`);
      } catch (err) {
        failed++;
        const errShort = err.message?.slice(0, 60) || "خطأ مجهول";
        errors.push(`• ${label}: ${errShort}`);
        console.error(`❌ [massreact] ${label} — ${errShort}`);
      }

      // delay بين كل تفاعل (مش في الأخير)
      if (i < threads.length - 1) {
        await randomDelay();
      }
    }

    // ── رسالة النتيجة ─────────────────────────────
    let result = `✅ انتهى MassReact!\n\n`;
    result    += `✔️ نجح: ${success}\n`;
    result    += `❌ فشل: ${failed}\n`;

    if (errors.length) {
      result += `\n⚠️ الأخطاء:\n${errors.slice(0, 5).join("\n")}`;
      if (errors.length > 5) result += `\n... و ${errors.length - 5} خطأ آخر`;
    }

    api.sendMessage(result, threadID);
  }
};
