// مخزن عالمي لإدارة الفواصل الزمنية لكل مجموعة
if (!global.s_loops) global.s_loops = {};

module.exports.config = {
  name: "s",
  aliases: ["s", "نيڪمو"],
  version: "2.1.0",
  author: "Hanji & Gemini",
  role: 2, 
  description: { en: "إرسال رسالة متكررة بفاصل زمني محدد مع تفاعل صامت" },
  category: "tools",
  guide: {
    en: "{pn} [المدة بالثواني] [الرسالة] - لبدء الإرسال\n{pn} off - لإيقاف الإرسال"
  },
  countDown: 0
};

module.exports.onStart = async ({ api, event, args }) => {
  const { threadID, messageID } = event;

  // 1. خيار الإيقاف
  if (args[0] === "off") {
    if (global.s_loops[threadID]) {
      clearInterval(global.s_loops[threadID]);
      delete global.s_loops[threadID];
      // تفاعل الصح عند الإيقاف أيضاً ليكون العمل متسقاً
      return api.setMessageReaction("✅", messageID, () => {}, true);
    }
    return;
  }

  // 2. تحليل الوقت والرسالة
  let delayInSeconds = parseInt(args[0]);
  let messageText;

  if (isNaN(delayInSeconds)) {
    delayInSeconds = 15;
    messageText = args.join(" ").trim();
  } else {
    messageText = args.slice(1).join(" ").trim();
  }

  // التحقق من وجود نص
  if (!messageText) return;

  // تحويل الثواني إلى ميلي ثانية
  const delayMs = delayInSeconds * 1000;

  // منع السبام القاتل (أقل من ثانية واحدة)
  if (delayMs < 1000) return;

  // 3. مسح أي حلقة قديمة تعمل في نفس المجموعة
  if (global.s_loops[threadID]) clearInterval(global.s_loops[threadID]);

  // التفاعل بعلامة الصح ✅ بدلاً من إرسال رسالة بداية
  api.setMessageReaction("✅", messageID, () => {}, true);

  // 4. بدء حلقة الإرسال
  global.s_loops[threadID] = setInterval(() => {
    api.sendMessage(messageText, threadID, (err) => {
      if (err) {
        // إذا حدث خطأ، يتم إيقاف الحلقة تلقائياً
        clearInterval(global.s_loops[threadID]);
        delete global.s_loops[threadID];
      }
    });
  }, delayMs);
};
