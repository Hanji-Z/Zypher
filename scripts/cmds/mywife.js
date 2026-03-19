const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");
const { createCanvas, loadImage } = require("canvas");

module.exports.config = {
  name: "mywife", 
  version: "3.5.0",
  role: 0, 
  author: "Hanji & Gemini",
  description: "أمر الزوجة مع رسائل مخصصة وحماية اللورد هانجي",
  category: "fun",
  cooldowns: 5
};

module.exports.onStart = async ({ event, api }) => {
  const { threadID, messageID, senderID, messageReply } = event;

  if (!messageReply) {
    return api.sendMessage("⚠️ المرجو الرد على رسالة الشخص!", threadID, messageID);
  }

  const rawUid1 = senderID; 
  const rawUid2 = messageReply.senderID; 
  const OWNER_ID = "61574764452026"; 

  // --- إعدادات الرسائل والأدوار ---
  let visualSlot1_UID = rawUid1; // الافتراضي: المرسل هو الرجل
  let visualSlot2_UID = rawUid2; // الافتراضي: المستهدف هو الزوجة
  let finalMessage = "𝐓𝐇𝐀𝐓'𝐒 𝐌𝐀𝐇 𝐖𝐈𝐅𝐄 🖤"; // الرسالة العادية

  // فخ اللورد هانجي: إذا حاول شخص العبث معك
  if (rawUid2 === OWNER_ID && rawUid1 !== OWNER_ID) {
    visualSlot1_UID = OWNER_ID; // أنت تصبح الرجل في الصورة
    visualSlot2_UID = rawUid1; // المعتدي يصبح الزوجة
    finalMessage = "𝐀 𝐠𝐨𝐨𝐝 𝐭𝐫𝐲, 𝐛𝐮𝐭 𝐢𝐭 𝐟𝐚𝐢𝐥𝐞𝐝. 𝐘𝐨𝐮 𝐚𝐫𝐞 𝐭𝐡𝐞 𝐰𝐢𝐟𝐞 𝐨𝐟 𝐌𝐫. 𝐇𝐀𝐍𝐉𝐈 🫢";
  }
  // ----------------------------------------

  const imgPath = path.join(__dirname, "cache", "kiss.jpg");

  if (!fs.existsSync(imgPath)) {
    return api.sendMessage("❌ خطأ: لم يتم العثور على صورة الخلفية 'kiss.jpg' في مجلد cache.", threadID, messageID);
  }

  try {
    api.setMessageReaction("⏳", messageID, () => {}, true);

    const avatarURL1 = `https://graph.facebook.com/${visualSlot1_UID}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
    const avatarURL2 = `https://graph.facebook.com/${visualSlot2_UID}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;

    const baseImage = await loadImage(imgPath);
    const canvas = createCanvas(baseImage.width, baseImage.height);
    const ctx = canvas.getContext("2d");

    // رسم الخلفية
    ctx.drawImage(baseImage, 0, 0, canvas.width, canvas.height);

    const avatar1 = await loadImage(avatarURL1);
    const avatar2 = await loadImage(avatarURL2);

    // --- رسم صورة الرجل/اللورد (Slot 1) ---
    const x1 = 818, y1 = 191, r1 = 268;
    ctx.save();
    ctx.beginPath();
    ctx.arc(x1, y1, r1 + 1, 0, Math.PI * 2);
    ctx.strokeStyle = "#FFFFFF"; 
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x1, y1, r1, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(avatar1, x1 - r1, y1 - r1, r1 * 2, r1 * 2);
    ctx.restore();

    // --- رسم صورة الزوجة (Slot 2) ---
    const x2 = 1817, y2 = 411, r2 = 268;
    ctx.save();
    ctx.beginPath();
    ctx.arc(x2, y2, r2 + 1, 0, Math.PI * 2);
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x2, y2, r2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(avatar2, x2 - r2, y2 - r2, r2 * 2, r2 * 2);
    ctx.restore();

    const savePath = path.join(__dirname, "cache", `wife_${Date.now()}.png`);
    fs.writeFileSync(savePath, canvas.toBuffer());

    // إرسال الصورة والرسالة المناسبة معاً
    api.sendMessage({
      body: finalMessage,
      attachment: fs.createReadStream(savePath)
    }, threadID, () => {
      fs.unlinkSync(savePath);
      api.setMessageReaction("✅", messageID, () => {}, true);
    }, messageID);

  } catch (error) {
    console.error(error);
    api.sendMessage("❌ حدث خطأ في معالجة الصور.", threadID, messageID);
  }
};

