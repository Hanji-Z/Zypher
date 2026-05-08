const { createCanvas, loadImage } = require("canvas");
const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");

module.exports = {
  config: {
    name: "welcome",
    version: "8.5",
    author: "Hanji x EryXenX",
    category: "events"
  },

  onStart: async ({ threadsData, message, event, api, usersData }) => {
    if (event.logMessageType !== "log:subscribe") return;

    const { threadID } = event;
    const threadData = await threadsData.get(threadID);
    
    // تأكد بلي الكروب مفعل فيه ميساج الترحيب
    if (!threadData.settings.sendWelcomeMessage) return;

    const addedMembers = event.logMessageData.addedParticipants;
    const threadName   = threadData.threadName || "Our Group";
    const inviterID    = event.author;

    for (const user of addedMembers) {
      const userID = user.userFbId;
      const botID  = api.getCurrentUserID();

      // إيلا دخل البوت للكروب
      if (userID == botID) {
        return message.send(`🤖 Thank you for adding Zypher System to ${threadName}! 💖\nType /help to start.`);
      }

      const userName    = user.fullName;
      const inviterName = await usersData.getName(inviterID);
      const memberCount = event.participantIDs.length;

      // إنشاء الكرت الترحيبي (The Canvas Magic)
      let welcomeImagePath = null;
      try {
        welcomeImagePath = await createWelcomeCard({
          userName, threadName, memberCount,
          inviterName, newUserID: userID,
          inviterID, threadID, api
        });
      } catch (err) {
        console.error("Welcome image creation failed:", err);
      }

      const msgBody = `𝗪𝗲𝗹𝗰𝗼𝗺𝗲 ${userName} 🎉\n┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n✦ Glad to have you here in ${threadName}! You are our ${memberCount}th member.`;

      const form = {
        body: msgBody,
        mentions: [{ tag: userName, id: userID }]
      };

      if (welcomeImagePath && fs.existsSync(welcomeImagePath)) {
        form.attachment = fs.createReadStream(welcomeImagePath);
      }

      // إرسال الترحيب
      await message.send(form);

      // مسح الملف المؤقت
      if (welcomeImagePath && fs.existsSync(welcomeImagePath)) {
        setTimeout(() => { try { fs.unlinkSync(welcomeImagePath); } catch (_) {} }, 5000);
      }
    }
  }
};

// --- دالة إنشاء التصويرة (إحداثيات وألوان الزيفر) ---
async function createWelcomeCard({ userName, threadName, memberCount, inviterName, newUserID, inviterID, threadID, api }) {
  const W = 1200, H = 630;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // تحميل صور البروفايل
  async function loadProfile(uid) {
    try {
      const url = `https://graph.facebook.com/${uid}/picture?width=500&height=500&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
      const res = await axios({ method: 'GET', url, responseType: 'arraybuffer' });
      return await loadImage(Buffer.from(res.data, 'binary'));
    } catch { return null; }
  }

  const [newUserImg, inviterImg] = await Promise.all([loadProfile(newUserID), loadProfile(inviterID)]);

  // Background Dark Theme
  ctx.fillStyle = '#09090f';
  ctx.fillRect(0, 0, W, H);

  // Left Section (Split Screen)
  const splitX = Math.round(W * 0.385);
  ctx.fillStyle = '#0d0d16';
  ctx.fillRect(0, 0, splitX, H);

  // Neon Border & Line
  ctx.strokeStyle = 'rgba(46,204,113,0.8)';
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(splitX, 0); ctx.lineTo(splitX, H); ctx.stroke();

  // Draw Avatar Circle (Main Member)
  const leftCX = splitX / 2;
  const avatarY = H / 2 - 20;
  const r = 110;

  ctx.save();
  ctx.beginPath(); ctx.arc(leftCX, avatarY, r, 0, Math.PI * 2); ctx.clip();
  if (newUserImg) ctx.drawImage(newUserImg, leftCX - r, avatarY - r, r * 2, r * 2);
  ctx.restore();

  // Glow Effect
  ctx.strokeStyle = '#2ecc71';
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(leftCX, avatarY, r + 5, 0, Math.PI * 2); ctx.stroke();

  // Text Branding
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 35px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(userName.substring(0, 15), leftCX, avatarY + r + 50);

  ctx.font = '20px Arial';
  ctx.fillStyle = '#2ecc71';
  ctx.fillText(`MEMBER #${memberCount}`, leftCX, avatarY + r + 85);

  // Right Section Content
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 50px Arial';
  ctx.fillText('WELCOME TO', splitX + 50, 150);
  
  ctx.fillStyle = '#2ecc71';
  ctx.font = 'bold 60px Arial';
  ctx.fillText(threadName.substring(0, 20), splitX + 50, 230);

  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = '25px Arial';
  ctx.fillText(`Invited by: ${inviterName}`, splitX + 50, H - 100);

  // Footer Signature
  ctx.font = 'italic 20px Arial';
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fillText('Powered by Zypher System - Hanji', splitX + 50, H - 40);

  const tempPath = path.join(__dirname, `welcome_${newUserID}.png`);
  await fs.writeFile(tempPath, canvas.toBuffer());
  return tempPath;
}

