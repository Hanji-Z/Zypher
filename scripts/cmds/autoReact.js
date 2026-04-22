const fs = require("fs-extra");
const path = require("path");

// مسار تخزين البيانات فـ الـ cache
const dataPath = path.join(__dirname, "cache", "autoreact_targets.json");

// إنشاء الملف أوتوماتيكياً إيلا مكنش موجود
if (!fs.existsSync(dataPath)) {
  fs.ensureDirSync(path.dirname(dataPath));
  fs.writeJsonSync(dataPath, {});
}

module.exports = {
  config: {
    name: "autoreact",
    aliases: ["autoR", "تفاعل"],
    version: "3.0.0",
    author: "Hanji",
    countDown: 5,
    role: 2, // للمطورين (هانجي)
    shortDescription: "تفاعل تلقائي ذكي (طاغ/ريبلاي) مع تجاهل الأوامر",
    category: "SYSTEM",
    guide: {
        en: "{pn} add @tag [emoji] | {pn} add (reply to someone) [emoji] | {pn} del | {pn} list"
    }
  },

  onStart: async function ({ api, event, args, message }) {
    const { threadID, messageID, mentions, messageReply } = event;
    const action = args[0]?.toLowerCase();
    let targets = fs.readJsonSync(dataPath);

    if (!targets[threadID]) targets[threadID] = {};

    switch (action) {
      case "add": {
        let targetIDs = [];
        
        // 1. جلب الآيديات من الريبلاي والمنشن
        if (messageReply) targetIDs.push(messageReply.senderID);
        if (Object.keys(mentions).length > 0) targetIDs = targetIDs.concat(Object.keys(mentions));
        
        // تنظيف القائمة من التكرار
        targetIDs = [...new Set(targetIDs)];

        if (targetIDs.length === 0) return message.reply("⚠️ من فضلك منشن الشخص أو رد على رسالته!");

        // 2. فحص الإيموجي (كيكون هو آخر عنصر فـ args)
        const lastArg = args[args.length - 1];
        const emojiRegex = /(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/;
        const hasEmoji = emojiRegex.test(lastArg);
        
        const finalEmoji = hasEmoji ? lastArg : "RANDOM";
        
        targetIDs.forEach(id => {
          targets[threadID][id] = finalEmoji;
        });

        fs.writeJsonSync(dataPath, targets);
        return message.reply(`[ 𝗭𝗬𝗣𝗛𝗘𝗥 - 𝗠𝗢𝗡𝗜𝗧𝗢𝗥𝗜𝗡𝗚 ]\n╼━━━━━━━━━━━━━━━━━━━━╾\n❯ Targets: ${targetIDs.length} user(s)\n❯ Mode: ${hasEmoji ? finalEmoji : "Dynamic Random 🔄"}\n╼━━━━━━━━━━━━━━━━━━━━╾`);
      }

      case "del":
      case "remove": {
        let targetIDs = [];
        if (messageReply) targetIDs.push(messageReply.senderID);
        if (Object.keys(mentions).length > 0) targetIDs = targetIDs.concat(Object.keys(mentions));

        if (targetIDs.length === 0) return message.reply("⚠️ من فضلك منشن الشخص أو رد عليه لحذفه!");

        targetIDs.forEach(id => {
          delete targets[threadID][id];
        });

        fs.writeJsonSync(dataPath, targets);
        return message.reply("✅ تم إيقاف التفاعل التلقائي مع الأهداف المحددة.");
      }

      case "list": {
        const list = targets[threadID];
        if (!list || Object.keys(list).length === 0) return message.reply("⚠️ قائمة المراقبة فارغة في هذه المجموعة.");
        
        let msg = "[ 𝗭𝗬𝗣𝗛𝗘𝗥 - 𝗪𝗔𝗧𝗖𝗛𝗟𝗜𝗦𝗧 ]\n╼━━━━━━━━━━━━━━━━━━━━╾\n";
        for (const id in list) {
          msg += `❯ UserID: ${id} | Emoji: ${list[id] === "RANDOM" ? "Mixed 🔄" : list[id]}\n`;
        }
        return message.reply(msg);
      }

      default:
        return message.reply("⚠️ الاستخدام:\n.ar add @tag [emoji]\n.ar del @tag\n.ar list");
    }
  },

  onChat: async function ({ api, event }) {
    const { threadID, senderID, messageID, body } = event;
    if (!body) return;

    // 🛡️ تجاهل الرسائل التي تبدأ بالبريفيكس (الأوامر)
    const prefix = global.GoatBot.config.prefix;
    if (body.startsWith(prefix)) return;

    let targets = fs.readJsonSync(dataPath);
    if (!targets[threadID] || !targets[threadID][senderID]) return;

    const userEmoji = targets[threadID][senderID];
    
    // قائمة الإيموجيات العشوائية (تقدر تزيد فيها لي بغيتي)
    const defaultEmojis = ["🐤", "🥢", "🩵", "🐈", "👑", "👻", "🍷", "😆", "⚡", "🪉", "👀"];
    
    const reaction = userEmoji === "RANDOM" 
      ? defaultEmojis[Math.floor(Math.random() * defaultEmojis.length)] 
      : userEmoji;

    api.setMessageReaction(reaction, messageID, (err) => {}, true);
  }
};

