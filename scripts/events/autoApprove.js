Entermodule.exports.config = {
  name: "autoApprove",
  eventType: ["log:subscribe"], 
  version: "1.2.0",
  author: "Hanji",
  description: "الموافقة التلقائية على المجموعات والترحيب الفوري"
};

module.exports.onStart = async ({ event, api, threadsData }) => {
  const { threadID, logMessageData } = event;
  const botID = api.getCurrentUserID();

  // 1. التحقق إذا كان العضو الجديد المضاف هو البوت نفسه
  if (logMessageData.addedParticipants.some(i => i.userFbId == botID)) {
    try {
      // تحديث بيانات المجموعة في قاعدة البيانات ليصبح البوت نشطاً فيها
      await threadsData.set(threadID, { isGroup: true });

      // إرسال رسالة ترحيب (هذه الخطوة هي التي تخرج المجموعة من الـ Pending)
      const msg = "✨ تـم تـفـعـيـل بـوت هـانـجـي بـنـجـاح! 🤤🫶\n\n" +
                  "🚀 أنـا الآن جـاهـز لـلـعـمـل فـي هـذه الـمـجـمـوعـة.\n" +
                  "📝 اكـتـب [ .help ] لـرؤيـة قـائـمـة الأوامـر.";

      await api.sendMessage(msg, threadID);

      // تغيير لقب البوت داخل المجموعة ليكون مميزاً
      const botName = global.GoatBot.config.botName || "HANJI BOT";
      await api.changeNickname(`—「 ${botName} 」—`, threadID, botID);

      console.log(`[ AUTO-APPROVE ] ✅ تـم تفعيل المجموعة: ${threadID}`);

    } catch (error) {
      console.error(`[ ERROR ] ❌ فشل في تفعيل المجموعة: ${error}`);
    }
  }
};

// 2. وظيفة إضافية: تنظيف قائمة الـ Pending كلما بدأ البوت (اختياري)
module.exports.onLoad = async ({ api }) => {
  console.log("🔍 جاري فحص طلبات المجموعات المعلقة...");
  
  api.getThreadList(100, null, ["PENDING", "OTHER"], async (err, list) => {
    if (err) return;
    
    for (const thread of list) {
      if (thread.isGroup && thread.isSubscribed) {
        // إرسال رسالة "إيقاظ" للمجموعات التي كانت معلقة سابقاً
        api.sendMessage("✨ بـوت هـانـجـي عـاد لـلـعـمـل! 🤤🫶", thread.threadID);
      }
    }
  });
};
