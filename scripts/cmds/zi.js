module.exports.config = {
  name: "zi",
  version: "1.1.0",
  role: 2, 
  author: "Gemini & ShAn",
  description: "الرد التلقائي الموحد (تفاعلا8ت فقط 8عند التشغيل/الإيقاف)",
  category: "الترفيه",
  guide: {
    en: "{pn} on [الكلمة] أو {pn} off"
  },
  countDowns: 5
};

// تخزين الحالة والكلمة المطلوبة والوقت
if (!global.zi_mode) global.zi_mode = {};
const OWNER_ID = "100068274995329"; 

module.exports.onChat = async ({ api, event }) => {
  const { threadID, messageID, senderID, body } = event;
  const botID = api.getCurrentUserID();

  // التحقق من تفعيل المود في المجموعة
  if (!global.zi_mode[threadID] || !global.zi_mode[threadID].active) return;
  
  const settings = global.zi_mode[threadID];
  const currentTime = Date.now();

  // الشروط: ليس البوت، ليس أنت، ليس أمراً، ومرور 8 ثوانٍ
  if (
    senderID !== botID && 
    senderID !== OWNER_ID && 
    body && !body.startsWith(".") && 
    (currentTime - (settings.lastSent || 0) >= 8000)
  ) {
    settings.lastSent = currentTime;
    return api.sendMessage(settings.word, threadID, messageID);
  }
};

module.exports.onStart = async ({ api, event, args }) => {
  const { threadID, messageID, senderID } = event;

  // أنت فقط من يتحكم بالأمر
  if (senderID !== OWNER_ID) return;

  const action = args[0]?.toLowerCase();

  if (action === "on") {
    const word = args.slice(1).join(" ");
    if (!word) return; // صمت تام حتى عند نسيان الكلمة

    global.zi_mode[threadID] = {
      active: true,
      word: word,
      lastSent: 0
    };

    // تفاعل التشغيل فقط
    api.setMessageReaction("⏳", messageID, () => {}, true);
  } 
  else if (action === "off") {
    if (global.zi_mode[threadID]) {
      global.zi_mode[threadID].active = false;
    }
    // تفاعل الإيقاف فقط
    api.setMessageReaction("✅", messageID, () => {}, true);
  }
};
