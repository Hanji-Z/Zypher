const fs = require("fs-extra");
const path = require("path");
const { createCanvas, loadImage, registerFont } = require("canvas");

const root = process.cwd();
const fontPath = path.join(root, "scripts", "cmds", "assets", "font", "ArianaVioleta-dz2K.ttf");
const symbolFontPath = path.join(root, "scripts", "cmds", "assets", "font", "segoe-ui-symbol.ttf");

const boyPath = path.join(root, "scripts", "cmds", "cache", "boy.jpg");
const girlPath = path.join(root, "scripts", "cmds", "cache", "girl.jpg");

if (fs.existsSync(fontPath)) registerFont(fontPath, { family: "ArianaVioleta" });
if (fs.existsSync(symbolFontPath)) registerFont(symbolFontPath, { family: "SegoeSymbol" });

module.exports.config = {
  name: "tem",
  version: "8.1.0",
  role: 2,
  author: "Gemini",
  description: "😥",
  category: "love",
  cooldowns: 7
};

module.exports.onStart = async ({ event, api, usersData, message }) => {
  const { threadID, messageID, senderID, messageReply } = event;
  if (!messageReply) return message.reply("يجب الرد على رسالة الشريك! ⚠️");

  try {
    api.setMessageReaction("🎨", messageID, () => {}, true);
    const uid1 = senderID;
    const uid2 = messageReply.senderID;

    const dataUser1 = await usersData.get(uid1);
    const dataUser2 = await usersData.get(uid2);
    const name1 = dataUser1.name || "User 1";
    const name2 = dataUser2.name || "User 2";

    const avatarURL1 = await usersData.getAvatarUrl(uid1);
    const avatarURL2 = await usersData.getAvatarUrl(uid2);

    // --- معالجة صورة الولد ---
    const base1 = await loadImage(boyPath);
    const canvas1 = createCanvas(base1.width, base1.height);
    const ctx1 = canvas1.getContext("2d");
    ctx1.drawImage(base1, 0, 0, canvas1.width, canvas1.height);
    
    const av1 = await loadImage(avatarURL1);
    const x1_av = 2332, y1_av = 279, r1 = 280; 

    ctx1.save();
    ctx1.beginPath();
    ctx1.arc(x1_av + r1, y1_av + r1, r1, 0, Math.PI * 2);
    ctx1.clip();
    ctx1.drawImage(av1, x1_av, y1_av, r1 * 2, r1 * 2);
    ctx1.restore();

    // إطار الولد (نحيف)
    ctx1.beginPath();
    ctx1.arc(x1_av + r1, y1_av + r1, r1, 0, Math.PI * 2);
    ctx1.strokeStyle = "#FFFFFF";
    ctx1.lineWidth = 4; // تم التقليل بناءً على طلبك
    ctx1.stroke();
    
    ctx1.font = "normal 100px ArianaVioleta, SegoeSymbol"; 
    ctx1.fillStyle = "white";
    ctx1.textAlign = "center";
    ctx1.textBaseline = "middle";
    ctx1.fillText(name1, 1187, 568);
    
    const path1 = path.join(root, "scripts", "cmds", "cache", `res_${uid1}.png`);
    fs.writeFileSync(path1, canvas1.toBuffer());

    // --- معالجة صورة البنت ---
    const base2 = await loadImage(girlPath);
    const canvas2 = createCanvas(base2.width, base2.height);
    const ctx2 = canvas2.getContext("2d");
    ctx2.drawImage(base2, 0, 0, canvas2.width, canvas2.height);
    
    const av2 = await loadImage(avatarURL2);
    const x2_av = 913, y2_av = 516, r2 = 120;

    ctx2.save();
    ctx2.beginPath();
    ctx2.arc(x2_av + r2, y2_av + r2, r2, 0, Math.PI * 2);
    ctx2.clip();
    ctx2.drawImage(av2, x2_av, y2_av, r2 * 2, r2 * 2);
    ctx2.restore();

    // إطار البنت (نحيف جداً)
    ctx2.beginPath();
    ctx2.arc(x2_av + r2, y2_av + r2, r2, 0, Math.PI * 2);
    ctx2.strokeStyle = "#FFFFFF";
    ctx2.lineWidth = 3; // إطار رقيق جداً
    ctx2.stroke();
    
    ctx2.font = "normal 67px ArianaVioleta, SegoeSymbol"; 
    ctx2.fillStyle = "white";
    ctx2.textAlign = "center";
    ctx2.textBaseline = "middle";
    ctx2.fillText(name2, 181, 411);
    
    const path2 = path.join(root, "scripts", "cmds", "cache", `res_${uid2}.png`);
    fs.writeFileSync(path2, canvas2.toBuffer());

    return message.reply({
      body: `𝚃𝙴𝙰𝙼 𝙴𝙵𝙵𝙸𝙲𝚃 𝙳𝙾𝙽𝙽𝙴! 🫶🤤\n👤: ${name1}\n👤: ${name2}`,
      attachment: [fs.createReadStream(path1), fs.createReadStream(path2)]
    }, () => {
      if (fs.existsSync(path1)) fs.unlinkSync(path1);
      if (fs.existsSync(path2)) fs.unlinkSync(path2);
    });

  } catch (error) {
    console.error(error);
    return message.reply("حدث خطأ تقني أثناء الرسم. ❌");
  }
};
