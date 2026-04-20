const fs = require("fs-extra");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");

const root = process.cwd();
// 🚩 حط سمية التصويرة الجديدة هنا (خاص تكون فـ cache)
const templateName = "shoha.jpg"; 
const templatePath = path.join(root, "scripts", "cmds", "cache", shoha.jpg);

module.exports.config = {
  name: "shoha",
  version: "8.6.0",
  role: 0,
  author: "myhe & Hanji", 
  description: "تطقيم مع حماية خاصة للمالك هانجي",
  category: "Fun",
  cooldowns: 7
};

module.exports.onStart = async ({ event, api, usersData, message }) => {
  const { threadID, messageID, senderID, messageReply } = event;
  
  // 🛡️ ليستا ديال الأيديات ديالك (زيد شحال ما بغيتي)
  const adminIDs = [
    "61574764452026", 
    "61578798203236", 
    "61567588014166"
  ];

  if (!messageReply) return message.reply("يجب الرد على رسالة الشريك! ⚠️");

  try {
    const targetID = messageReply.senderID;

    // 🛡️ نظام الحماية المتعدد
    if (adminIDs.includes(targetID) && !adminIDs.includes(senderID)) {
        api.setMessageReaction("❌", messageID, () => {}, true);
        return message.reply("𝐘𝐨𝐮 𝐝𝐨𝐧'𝐭 𝐡𝐚𝐯𝐞 𝐩𝐞𝐫𝐦𝐢𝐬𝐬𝐢𝐨𝐧 😥");
    }

    api.setMessageReaction("🎨", messageID, () => {}, true);
    
    let uid1 = targetID; 
    let uid2 = senderID; 

    const avatarURL1 = await usersData.getAvatarUrl(uid1);
    const avatarURL2 = await usersData.getAvatarUrl(uid2);

    if (!fs.existsSync(templatePath)) {
        return message.reply(`لم يتم العثور على القالب ${templateName} في مجلد cache! ❌`);
    }

    const baseImage = await loadImage(templatePath);
    const canvas = createCanvas(baseImage.width, baseImage.height);
    const ctx = canvas.getContext("2d");
    
    ctx.drawImage(baseImage, 0, 0, canvas.width, canvas.height);
    
    const av1 = await loadImage(avatarURL1);
    const av2 = await loadImage(avatarURL2);

    // ==========================================
    // 1️⃣ رسم صورة "المرأة" (بدّل الإحداثيات هنا)
    // ==========================================
    const x1_av = 562, y1_av = 744, r1 = 100; 
    ctx.save();
    ctx.beginPath();
    ctx.arc(x1_av + r1, y1_av + r1, r1, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(av1, x1_av, y1_av, r1 * 2, r1 * 2);
    ctx.restore();
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 5;
    ctx.stroke();

    // ==========================================
    // 2️⃣ رسم صورة "الرجل/أنت" (بدّل الإحداثيات هنا)
    // ==========================================
    const x2_av = 1208, y2_av = 389, r2 = 121;
    ctx.save();
    ctx.beginPath();
    ctx.arc(x2_av + r2, y2_av + r2, r2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(av2, x2_av, y2_av, r2 * 2, r2 * 2);
    ctx.restore();
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 5;
    ctx.stroke();
    
    const finalPath = path.join(root, "scripts", "cmds", "cache", `match_${Date.now()}.png`);
    fs.writeFileSync(finalPath, canvas.toBuffer());

    return message.reply({
      body: "𝐓𝐇𝐀𝐓'𝐒 𝐏𝐈𝐂 𝐃𝐎𝐍𝐍𝐄 🖤",
      attachment: fs.createReadStream(finalPath)
    }, () => {
      if (fs.existsSync(finalPath)) fs.unlinkSync(finalPath);
    });

  } catch (error) {
    console.error(error);
    return message.reply("حدث خطأ تقني أثناء الرسم. ❌");
  }
};
