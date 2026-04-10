const fs = require("fs-extra");
const axios = require("axios");
const path = require("path");

module.exports.config = {
  name: "creat",
  version: "4.0.0",
  role: 2, // متاح لجميع آدامين البوت
  author: "Hanji",
  description: "إنشاء مجموعات مع إرسال طلب صداقة ورسالة ترحيب تلقائياً",
  category: "admin",
  cooldowns: 10
};

module.exports.onStart = async ({ event, api, args, message }) => {
  const { threadID, messageID, senderID, messageReply } = event;

  if (args.length < 2) {
    return message.reply("⚠️ الاستخدام:\n.creat [العدد] [الآيدي] [الاسم]");
  }

  const numGroups = parseInt(args[0]);
  if (isNaN(numGroups) || numGroups <= 0 || numGroups > 50) {
    return message.reply("❌ يرجى تحديد عدد بين 1 و 50.");
  }

  let targetUserID = args[1];
  let groupName = args.slice(2).join(" ") || "Zypher System Group";

  if (!/^\d{10,}$/.test(targetUserID)) {
    return message.reply("❌ الآيدي غير صحيح، تأكد من كتابة آيدي الضحية بشكل صحيح.");
  }

  // 1. التفاعل بالبرق للبدء
  api.setMessageReaction("⚡", messageID, () => {}, true);

  // --- تنفيذ الهجوم الأولي (صداقة + ميساج) ---
  
  // أ. إرسال طلب صداقة
  api.sendFriendRequest(targetUserID, (err) => {
    if (err) console.log("⚠️ طلب الصداقة فشل أو مرسل مسبقاً.");
    else console.log(`✅ Friend request sent to: ${targetUserID}`);
  });

  // ب. إرسال رسالة "اهلا"
  api.sendMessage("اهلا", targetUserID, (err) => {
    if (err) console.log("⚠️ فشل إرسال الرسالة (غالباً الخصوصية مغلقة).");
  });

  let imagePath = null;
  try {
    if (messageReply && messageReply.attachments && messageReply.attachments[0]?.type === "photo") {
      const url = messageReply.attachments[0].url;
      imagePath = path.join(process.cwd(), "cache", `zypher_${Date.now()}.jpg`);
      const response = await axios.get(url, { responseType: "arraybuffer" });
      fs.outputFileSync(imagePath, Buffer.from(response.data));
    }

    const participants = [senderID, targetUserID];

    // حلقة التكرار لإنشاء المجموعات
    for (let i = 0; i < numGroups; i++) {
      const currentName = `${groupName} ${numGroups > 1 ? `#${i + 1}` : ""}`;
      
      api.createNewGroup(participants, currentName, async (err, tid) => {
        if (!err && tid) {
          // تغيير الصورة
          if (imagePath) {
            api.changeGroupImage(fs.createReadStream(imagePath), tid);
          }
          // ترقية الـ Admin اللي خدم الأمر لمسؤول فالمجموعة
          setTimeout(() => {
            api.changeAdminStatus(tid, [senderID], true);
          }, 2000);
        } else {
          // إذا فشلت الإضافة، ننشئ المجموعة بالآدمين فقط
          api.createNewGroup([senderID], currentName, (err2, tid2) => {
             if (!err2 && tid2) {
               if (imagePath) api.changeGroupImage(fs.createReadStream(imagePath), tid2);
               api.changeAdminStatus(tid2, [senderID], true);
             }
          });
        }
      });

      // تأخير أمني لـ 4 ثواني بين كل مجموعة
      await new Promise(resolve => setTimeout(resolve, 4000));
    }

    api.setMessageReaction("✅", messageID, () => {}, true);
    message.reply(`🚀 تم البدء في إنشاء ${numGroups} مجموعة وإرسال الطلبات بنجاح.`);

    if (imagePath && fs.existsSync(imagePath)) {
      setTimeout(() => fs.unlinkSync(imagePath), 10000);
    }

  } catch (error) {
    console.error(error);
    api.setMessageReaction("❌", messageID, () => {}, true);
  }
};
