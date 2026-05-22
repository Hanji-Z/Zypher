/*
  ╔══════════════════════════════════════════╗
  ║          PUNCH — v1.0                    ║
  ║  💥  اضرب واحد بلكمة قوية               ║
  ╚══════════════════════════════════════════╝
*/

const punchLines = [
  "💥 {sender} لكم {target} لكمة عدوها من الأرض!",
  "👊 {sender} ضرب {target} وطارت نجوم! ⭐⭐⭐",
  "🥊 {sender} كيل فيها لـ{target} هبلة كيك!",
  "💢 {sender} شرجم {target} بلا رحمة 😤",
  "🌪️ {sender} دار فيها لـ{target} اوبركات من الجنة!",
  "🤜 {sender} قرطم {target} وولات تدور على راسها!",
  "💫 {target} طارت عينيه من اللكمة ديال {sender}!",
  "😵 {target} شاف النجوم بعد لكمة {sender}!",
  "🔥 {sender} مسح الأرض بـ{target}!",
  "💥 BOOM! {sender} فجّر {target} بلكمة واحدة!"
];

module.exports = {
  config: {
    name: "punch",
    version: "1.0",
    author: "ShAn",
    role: 0,
    countDown: 3,
    category: "fun",
    shortDescription: "اضرب واحد بلكمة 💥",
    longDescription: "اضرب شخص محدد بلكمة قوية",
    guide: "{pn} @mention"
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID, senderID, mentions } = event;

    const mentionIDs = Object.keys(mentions || {});
    if (!mentionIDs.length) {
      return api.sendMessage("👊 تاغ واحد باش تضربه!", threadID, messageID);
    }

    const targetID   = mentionIDs[0];
    const targetName = (mentions[targetID] || "").replace(/^@/, "").trim();

    // جيب اسم المرسل
    let senderName = "واحد";
    try {
      const info = await api.getUserInfo(senderID);
      senderName = info?.[senderID]?.name || "واحد";
    } catch {}

    const line = punchLines[Math.floor(Math.random() * punchLines.length)];
    const msg  = line
      .replace("{sender}", senderName)
      .replace("{target}", targetName);

    return api.sendMessage(msg, threadID, messageID);
  }
};
