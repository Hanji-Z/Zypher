const fs = require("fs-extra");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");

const root = process.cwd();
// مسار خلفية التصميم في مجلد cache
const bgPath = path.join(root, "scripts", "cmds", "cache", "kiss.jpg");

module.exports.config = {
  name: "mywife",
  version: "4.1.0",
  role: 0,
  author: "Hanji",
  description: ".",
  category: "love",
  cooldowns: 7
};

module.exports.onStart = async ({ event, api, usersData, message }) => {
  const { threadID, messageID, senderID, messageReply } = event;
  if (!messageReply) return message.reply("⚠️ المرجو الرد على رسالة الشريك!");

  try {
    api.setMessageReaction("🎨", messageID, () => {}, true);

    let uid1 = senderID;
    let uid2 = messageReply.senderID;
    const OWNER_ID = "61574764452026";
    let finalMessage = "𝐓𝐇𝐀𝐓'𝐒 𝐌𝐀𝐇 𝐖𝐈𝐅𝐄 🖤";

    // --- فخ اللورد هانجي: قلب الأدوار والرسائل ---
    if (uid2 === OWNER_ID && uid1 !== OWNER_ID) {
      uid1 = OWNER_ID; // أنت تصبح في مكان الرجل
      uid2 = senderID; // هو يصبح في مكان الزوجة
      finalMessage = "𝐀 𝐠𝐨𝐨𝐝 𝐭𝐫𝐲, 𝐛𝐮𝐭 𝐢𝐭 𝐟𝐚𝐢𝐥𝐞𝐝. 𝐘𝐨𝐮 𝐚𝐫𝐞 𝐭𝐡𝐞 𝐰𝐢𝐟𝐞 𝐨𝐟 𝐌𝐫. 𝐇𝐀𝐍𝐉𝐈 🫢";
    }

    // جلب روابط الصور الشخصية مباشرة من نظام بيانات البوت
    const avatarURL1 = await usersData.getAvatarUrl(uid1);
    const avatarURL2 = await usersData.getAvatarUrl(uid2);

    // تحميل صورة الخلفية
    if (!fs.existsSync(bgPath)) return message.reply("❌ خطأ: ملف kiss.jpg غير موجود في مجلد cache.");
    
    const baseImage = await loadImage(bgPath);
    const canvas = createCanvas(baseImage.width, baseImage.height);
    const ctx = canvas.getContext("2d");
    
    // رسم الخلفية الأصلية
    ctx.drawImage(baseImage, 0, 0, canvas.width, canvas.height);

    // --- رسم صورة الشخص الأول (الرجل/اللورد) بالإحداثيات الأصلية ---
    const av1 = await loadImage(avatarURL1);
    const x1 = 818, y1 = 191, r1 = 268; 
    
    ctx.save();
    ctx.beginPath();
    ctx.arc(x1, y1, r1, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(av1, x1 - r1, y1 - r1, r1 * 2, r1 * 2);
    ctx.restore();

    // إطار أبيض نحيف (سمك 2)
    ctx.beginPath();
    ctx.arc(x1, y1, r1, 0, Math.PI * 2);
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 2;
    ctx.stroke();

    // --- رسم صورة الشخص الثاني (الزوجة) بالإحداثيات الأصلية ---
    const av2 = await loadImage(avatarURL2);
    const x2 = 1817, y2 = 411, r2 = 268; 
    
    ctx.save();
    ctx.beginPath();
    ctx.arc(x2, y2, r2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(av2, x2 - r2, y2 - r2, r2 * 2, r2 * 2);
    ctx.restore();

    // إطار أبيض نحيف (سمك 2)
    ctx.beginPath();
    ctx.arc(x2, y2, r2, 0, Math.PI * 2);
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 2;
    ctx.stroke();

    // حفظ الصورة النهائية
    const savePath = path.join(root, "scripts", "cmds", "cache", `wife_${Date.now()}.png`);
    fs.writeFileSync(savePath, canvas.toBuffer());

    // إرسال النتيجة
    return message.reply({
      body: finalMessage,
      attachment: fs.createReadStream(savePath)
    }, () => {
      if (fs.existsSync(savePath)) fs.unlinkSync(savePath);
      api.setMessageReaction("✅", messageID, () => {}, true);
    });

  } catch (error) {
    console.error(error);
    return message.reply("❌ حدث خطأ تقني أثناء معالجة الصورة.");
  }
};
