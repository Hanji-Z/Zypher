module.exports.config = {
  name: "autoApprove",
  eventType: ["log:subscribe"],
  version: "2.0.0",
  author: "Hanji",
  category: "events",
  description: "الموافقة التلقائية وتنشيط كل المجلدات (Inbox, Pending, Other)"
};

// 1️⃣ الجزء المسؤول عن تنشيط المجموعات "عند تشغيل البوت" (onLoad)
module.exports.onLoad = async ({ api }) => {
  console.log("🚀 جاري فحص وتنشيط جميع المجموعات (بما فيها المخفية)...");

  // جلب القوائم من كل المجلدات لضمان أن البوت "يرى" المجموعات 2، 6، 8 وغيرها
  const folders = ["INBOX", "PENDING", "OTHER"];
  
  for (const folder of folders) {
    api.getThreadList(50, null, [folder], (err, list) => {
      if (err || !list) return;

      list.forEach(async (thread) => {
        if (thread.isGroup && thread.isSubscribed) {
          // إرسال تفاعل (Reaction) وتنبيه بسيط لتنشيط المحادثة
          api.setMessageReaction("✅", thread.threadID, () => {}, true);
          
          // تأخير بسيط لتجنب حظر فيسبوك (Cooldown)
          setTimeout(() => {
            api.sendMessage("✨ بـوت هـانـجـي نـشـط الآن فـي هـذه الـمـجـمـوعـة! 🤤🫶", thread.threadID);
          }, 5000); 
        }
      });
    });
  }
};

// 2️⃣ الجزء المسؤول عن "الموافقة الفورية" عند إضافة البوت لمجموعة جديدة (onStart)
module.exports.onStart = async ({ event, api, threadsData }) => {
  const { threadID, logMessageData } = event;
  const botID = api.getCurrentUserID();

  // التحقق إذا كان العضو المضاف هو البوت
  if (logMessageData.addedParticipants.some(i => i.userFbId == botID)) {
    try {
      // تسجيل المجموعة في قاعدة البيانات فوراً
      await threadsData.set(threadID, { isGroup: true });

      // إرسال رسالة ترحيب مقتضبة وذكية
      const welcomeMsg = "🚀 تـم الـتـفـعـيـل! أنـا جـاهـز لـلـخـدمـة.\n📝 اكـتـب [ .help ] لـلأوامـر.";
      
      await api.sendMessage(welcomeMsg, threadID);

      // تغيير اللقب لتمييز البوت
      const name = global.GoatBot.config.botName || "HANJI BOT";
      await api.changeNickname(`—「 ${name} 」—`, threadID, botID);

      console.log(`✅ [SUCCESS] تـم تفعيل المجموعة الجديدة: ${threadID}`);
    } catch (error) {
      console.error(`❌ [ERROR] فشل التفعيل التلقائي: ${error}`);
    }
  }
};
