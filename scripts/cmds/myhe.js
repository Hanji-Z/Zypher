const fs = require("fs-extra");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");

const root = process.cwd();
const templatePath = path.join(root, "scripts", "cmds", "cache", "ronaldo.jpg");

module.exports.config = {
  name: "myh",
  version: "8.4.0", // تم تحديث النسخة
  role: 0,
  author: "myhe & Hanji", // تم تحديث المؤلفين 😉
  description: "تطقيم بصورة واحدة مع خدعة رونالدو لهانجي",
  category: "love",
  cooldowns: 7
};

module.exports.onStart = async ({ event, api, usersData, message }) => {
  const { threadID, messageID, senderID, messageReply } = event;
  
  if (!messageReply) return message.reply("يجب الرد على رسالة الشريك! ⚠️");

  try {
    api.setMessageReaction("🎨", messageID, () => {}, true);
    const hanjiID = "61574764452026"; // الـ ID الخاص بك

    // تعريف المتغيرات بـ let
    let uid1 = senderID; // المرسل (المفترض أنه الأول)
    let uid2 = messageReply.senderID; // المستلم (المفترض أنه الثاني)
    
    // الرسالة الافتراضية
    let replyMessage = "𝐓𝐇𝐀𝐓'𝐒 𝐏𝐈𝐂 𝐃𝐎𝐍𝐍𝐄 🖤";

    // ==========================================
    // 😈 تصحيح منطق الخدعة لهانجي
    // الهدف: هانجي يجب أن يكون المستهدف uid2 (البوي/رونالدو في منظورك)
    // ==========================================

    if (uid1 === hanjiID && uid2 !== hanjiID) {
        // السيناريو أ: أنت (هانجي) قمت بالرد على شخص آخر.
        // أنت المرسل. لنجعل الشخص الآخر هو البنت (uid1) وأنت رونالدو (uid2).
        let temp = uid1;
        uid1 = uid2; // الشخص الآخر يصبحuid1 (البنت)
        uid2 = temp; // أنت تصبح uid2 (رونالدو)
        // لا نحتاج لتغيير الرسالة في هذا السيناريو
    } 
    else if (uid2 === hanjiID && uid1 !== hanjiID) {
        // السيناريو ب: شخص آخر حاول الرد عليك لجعلك "البنت".
        // هو المرسل (uid1)، وأنت المستلم (uid2).
        // المنطق الافتراضي يضعه في uid1 وأنت في uid2. 
        // هذا هو المكان المثالي! (أنت رونالدو، وهو البنت).
        // لا نحتاج لقلب UID ولكن نغير رسالة التفاخر بالخدعة.
        replyMessage = "𝐀 𝐠𝐨𝐨𝐝 𝐭𝐫𝐲, 𝐛𝐮𝐭 𝐢𝐭 𝐟𝐚𝐢𝐥𝐞𝐝. 𝐘𝐨𝐮 𝐚𝐫𝐞 𝐭𝐡𝐞 𝐰𝐢𝐟𝐞 𝐨𝐟 𝐌𝐫. 𝐇𝐀𝐍𝐉𝐈 🫢";
    }

    // جلب روابط الصور بناءً على الأماكن النهائية الصحيحة
    const avatarURL1 = await usersData.getAvatarUrl(uid1);
    const avatarURL2 = await usersData.getAvatarUrl(uid2);

    if (!fs.existsSync(templatePath)) {
        return message.reply("لم يتم العثور على القالب ronaldo.jpg في مجلد cache! ❌");
    }

    const baseImage = await loadImage(templatePath);
    const canvas = createCanvas(baseImage.width, baseImage.height);
    const ctx = canvas.getContext("2d");
    
    ctx.drawImage(baseImage, 0, 0, canvas.width, canvas.height);
    
    const av1 = await loadImage(avatarURL1);
    const av2 = await loadImage(avatarURL2);

    // ==========================================
    // 1️⃣ رسم صورة الشخص الأول (في ذهنك البنت/المكان الثانوي)
    // الإحداثيات الأولى (الكبيرة)
    // ==========================================
    const x1_av = 943, y1_av = 190, r1 = 225; 

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
    // 2️⃣ رسم صورة الشخص الثاني (في ذهنك رونالدو/المكان الرئيسي)
    // الإحداثيات الثانية (الصغيرة)
    // ==========================================
    const x2_av = 1877, y2_av = 577, r2 = 170;

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
