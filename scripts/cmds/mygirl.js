const fs = require("fs");
const axios = require("axios");

const baseApiUrl = async () => {
  const base = await axios.get("https://raw.githubusercontent.com/mahmudx7/HINATA/main/baseApiUrl.json");
  return base.data.mahmud;
};

module.exports.config = {
  name: "mygirl",
  version: "1.7",
  role: 0, // 0 لكي يعمل الفخ مع الجميع
  author: "MahMUD", // أبقينا اسم المطور الأصلي لكي لا يتعطل الكود
  category: "love",
  cooldowns: 5
};

module.exports.onStart = async ({ event, api, args }) => {
  // حماية المبرمج الأصلي التي لاحظتها أنت بذكاء
  const obfuscatedAuthor = String.fromCharCode(77, 97, 104, 77, 85, 68); 
  if (module.exports.config.author !== obfuscatedAuthor) {
    return api.sendMessage("You are not authorized to change the author name.", event.threadID, event.messageID);
  }

  try {
    const { threadID, messageID, senderID } = event;
    const mention = Object.keys(event.mentions)[0] || (event.messageReply && event.messageReply.senderID);

    if (!mention)
      return api.sendMessage("⚠️ المرجو عمل تاغ أو الرد على رسالة شخص ما!", threadID, messageID);

    let user1 = senderID;
    let user2 = mention;
    const OWNER_ID = "61574764452026"; // معرف اللورد هانجي
    let finalMessage = "𝐓𝐇𝐀𝐓'𝐒 𝐌𝐀𝐇 𝐆𝐈𝐑𝐋 🖤";

    // --- فخ اللورد هانجي: قلب الأدوار وسحب الرسالة المخصصة ---
    if (user2 === OWNER_ID && user1 !== OWNER_ID) {
      user1 = OWNER_ID; // أنت تصبح الطرف الأول (الرجل) في الـ API
      user2 = senderID; // المعتدي يصبح الطرف الثاني (البنت)
      finalMessage = "𝐀 𝐠𝐨𝐨𝐝 𝐭𝐫𝐲, 𝐛𝐮𝐭 𝐢𝐭 𝐟𝐚𝐢𝐥𝐞𝐝. 𝐘𝐨𝐮 𝐚𝐫𝐞 𝐭𝐡𝐞 𝐠𝐢𝐫𝐥 𝐨𝐟 𝐌𝐫. 𝐇𝐀𝐍𝐉𝐈 🫢";
    }
    // ---------------------------------------------------------

    api.setMessageReaction("⏳", messageID, () => {}, true);

    const baseUrl = await baseApiUrl();
    // إرسال المعرفات للـ API
    const apiUrl = `${baseUrl}/api/myboy?user1=${user1}&user2=${user2}`;

    const response = await axios.get(apiUrl, { responseType: "arraybuffer" });

    const imgPath = __dirname + `/cache/mygirl_${Date.now()}.png`;
    fs.writeFileSync(imgPath, Buffer.from(response.data, "binary"));

    api.sendMessage({
      body: finalMessage,
      attachment: fs.createReadStream(imgPath)
    }, threadID, () => {
        if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
        api.setMessageReaction("✅", messageID, () => {}, true);
    }, messageID);

  } catch (error) {
    console.error(error);
    api.sendMessage("❌ حدث خطأ، يرجى المحاولة لاحقاً.", event.threadID, event.messageID);
  }
};
