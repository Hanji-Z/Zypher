Enterconst fs = require("fs-extra");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");

const root = process.cwd();
const templatePath = path.join(root, "scripts", "cmds", "cache", "template.jpg");

module.exports.config = {
  name: "hanji",
  version: "8.3.0",
  role: 0,
  author: "Hanji", 
  description: "تط8قيم بصورة واحدة مع خدعة السيد هانجي",
  category: "love",
  cooldowns: 7
};

module.exports.onStart = async ({ event, api, usersData, message }) => {
  const { threadID, messageID, senderID, messageReply } = event;
  
  if (!messageReply) return message.reply("يجب الرد على رسالة الشريك! ⚠️");

  try {
    api.setMessageReaction("🎨", messageID, () => {}, true);
    
    // تعريف المتغيرات بـ let لكي نتمكن من التبديل بينهما
    let uid1 = senderID; // المفترض أنه المرسل (الولد)
    let uid2 = messageReply.senderID; // المفترض أنه المستلم (البنت)
    
    // الرسالة الافتراضية
    let replyMessage = "𝐓𝐇𝐀𝐓'𝐒 𝐌𝐀𝐇 𝐖𝐈𝐅𝐄 🖤";

    // 😈 خدعة هانجي (تبديل الأماكن إذا كان المستلم هو أنت)
    const hanjiID = "61574764452026"; // الـ ID الخاص بك
    
    if (uid2 === hanjiID && uid1 !== hanjiID) {
        // إذا حاول أحدهم تطبيق الأمر عليك، يتم قلب الأماكن
        let temp = uid1;
        uid1 = uid2; // تصبح أنت الولد
        uid2 = temp; // يصبح هو البنت
        
        // تغيير الرسالة لتناسب الخدعة
        replyMessage = "𝐀 𝐠𝐨𝐨𝐝 𝐭𝐫𝐲, 𝐛𝐮𝐭 𝐢𝐭 𝐟𝐚𝐢𝐥𝐞𝐝. 𝐘𝐨𝐮 𝐚𝐫𝐞 𝐭𝐡𝐞 𝐰𝐢𝐟𝐞 𝐨𝐟 𝐌𝐫. 𝐇𝐀𝐍𝐉𝐈 🫢";
    }

    // جلب روابط الصور بناءً على الأماكن الجديدة (بعد الخدعة)
    const avatarURL1 = await usersData.getAvatarUrl(uid1);
    const avatarURL2 = await usersData.getAvatarUrl(uid2);

    if (!fs.existsSync(templatePath)) {
        return message.reply("لم يتم العثور على القالب template.jpg في مجلد cache! ❌");
    }

    const baseImage = await loadImage(templatePath);
    const canvas = createCanvas(baseImage.width, baseImage.height);
    const ctx = canvas.getContext("2d");
    
    ctx.drawImage(baseImage, 0, 0, canvas.width, canvas.height);
    
    const av1 = await loadImage(avatarURL1);
    const av2 = await loadImage(avatarURL2);

    // ==========================================
    // 1️⃣ رسم صورة الشخص الأول (الولد)
    // ==========================================
    const x1_av = 818, y1_av = 191, r1 = 268; 

    ctx.save();
    ctx.beginPath();
    ctx.arc(x1_av + r1, y1_av + r1, r1, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(av1, x1_av, y1_av, r1 * 2, r1 * 2);
    ctx.restore();

    ctx.beginPath();
    ctx.arc(x1_av + r1, y1_av + r1, r1, 0, Math.PI * 2);
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 4;
    ctx.stroke();

    // ==========================================
    // 2️⃣ رسم صورة الشخص الثاني (البنت)
    // ==========================================
    const x2_av = 1817, y2_av = 411, r2 = 268;

    ctx.save();
    ctx.beginPath();
    ctx.arc(x2_av + r2, y2_av + r2, r2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(av2, x2_av, y2_av, r2 * 2, r2 * 2);
    ctx.restore();

    ctx.beginPath();
    ctx.arc(x2_av + r2, y2_av + r2, r2, 0, Math.PI * 2);
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // اسم مميز للصورة لتجنب تداخل الطلبات
    const finalPath = path.join(root, "scripts", "cmds", "cache", `match_${Date.now()}.png`);
    fs.writeFileSync(finalPath, canvas.toBuffer());

    return message.reply({
      body: replyMessage,
      attachment: fs.createReadStream(finalPath)
    }, () => {
      if (fs.existsSync(finalPath)) fs.unlinkSync(finalPath);
    });

  } catch (error) {
    console.error(error);
    return message.reply("حدث خطأ تقني أثناء الرسم. ❌");
  }
};
