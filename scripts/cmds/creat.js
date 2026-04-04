const fs = require("fs-extra");
const axios = require("axios");
const path = require("path");

module.exports.config = {
  name: "creat",
  version: "2.5.0",
  role: 2, // للمالك فقط (هانجي)
  author: "Hanji",
  description: "إنشاء مجموعات (حتى 50) مع إضافة أشخاص وترقيتك لمسؤول تلقائياً",
  category: "owner",
  cooldowns: 10
};

module.exports.onStart = async ({ event, api, args, message }) => {
  const { threadID, messageID, senderID, messageReply } = event;
  const myID = "61576409082042"; // الآيدي الخاص بك يا هانجي

  // التحقق من وجود عدد المجموعات على الأقل
  if (args.length < 2) {
    return message.reply("⚠️ الاستخدام:\n1. مع آيدي: .creat [العدد] [الآيدي] [الاسم]\n2. بدون آيدي: .creat [العدد] [الاسم]");
  }

  const numGroups = parseInt(args[0]);
  if (isNaN(numGroups) || numGroups <= 0 || numGroups > 500) {
    return message.reply("❌ يرجى تحديد عدد مجموعات بين 1 و 50.");
  }

  // --- تحليل المدخلات (الذكاء في التعرف على الآيدي) ---
  let targetUserID = null;
  let groupName = "";

  // إذا كانت الكلمة الثانية أرقاماً فقط بطول 10 خانات أو أكثر، نعتبرها آيدي
  if (/^\d{10,}$/.test(args[1])) {
    targetUserID = args[1];
    groupName = args.slice(2).join(" ") || "بدون اسم";
  } else {
    groupName = args.slice(1).join(" ") || "بدون اسم";
  }

  // 1. التفاعل بإيموجي الساعة للبدء
  api.setMessageReaction("🕒", messageID, () => {}, true);

  let imagePath = null;
  try {
    // معالجة صورة الرد (إن وجدت)
    if (messageReply && messageReply.attachments && messageReply.attachments[0]?.type === "photo") {
      const url = messageReply.attachments[0].url;
      imagePath = path.join(process.cwd(), "scripts", "cmds", "cache", `gr_temp_${Date.now()}.jpg`);
      const response = await axios.get(url, { responseType: "arraybuffer" });
      fs.writeFileSync(imagePath, Buffer.from(response.data));
    }

    // مصفوفة الأعضاء (أنت دائماً موجود)
    const participants = [myID];
    if (targetUserID && targetUserID !== myID) participants.push(targetUserID);

    // حلقة التكرار لإنشاء المجموعات
    for (let i = 0; i < numGroups; i++) {
      const currentName = `${groupName} ${numGroups > 1 ? `#${i + 1}` : ""}`;
      
      api.createNewGroup(participants, currentName, async (err, tid) => {
        if (!err && tid) {
          // أ. تغيير صورة المجموعة
          if (imagePath) {
            const imgStream = fs.createReadStream(imagePath);
            api.changeGroupImage(imgStream, tid);
          }

          // ب. ترقية المالك (هانجي) لمسؤول فوراً
          setTimeout(() => {
            api.changeAdminStatus(tid, [myID], true, (adminErr) => {
              if (adminErr) console.error(`فشلت ترقية الأدمن في المجموعة: ${tid}`);
            });
          }, 1000);
        }
      });

      // 2. الانتظار لمدة 3 ثوانٍ بين كل عملية لضمان الأمان
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    // 3. التفاعل بعلامة الصح عند الاكتمال
    api.setMessageReaction("✅", messageID, () => {}, true);

    // تنظيف ملف الصورة المؤقت
    if (imagePath && fs.existsSync(imagePath)) {
      setTimeout(() => fs.unlinkSync(imagePath), 5000);
    }

  } catch (error) {
    console.error(error);
    api.setMessageReaction("❌", messageID, () => {}, true);
    return message.reply("❌ حدث خطأ تقني أثناء محاولة الإنشاء.");
  }
};

