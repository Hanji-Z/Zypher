module.exports.config = {
  name: "spamkick",
  version: "1.1.0",
  role: 1, 
  author: "ShAn & Hanji (Gemini)",
  usePrefix: true,
  description: { 
      en: "Automatically kick a user who spams messages (6 msgs in 10s)"
  },
  category: "GROUP",
  guide: { en: "[on/off]" },
  countDown: 5
};

module.exports.onChat = async ({ api, event, usersData, commandName }) => {
  const { senderID, threadID, messageID } = event;

  // 🛡️ الفران: إيلا ما مديورش ON لهاد لڭروب، ماديير والو
  if (!global.antispam || !global.antispam.has(threadID)) return;

  const threadInfo = global.antispam.get(threadID);
  
  if (!(senderID in threadInfo.users)) {
    threadInfo.users[senderID] = { count: 1, time: Date.now() };
  } else {
    threadInfo.users[senderID].count++;
    
    const timePassed = Date.now() - threadInfo.users[senderID].time;
    const messages = threadInfo.users[senderID].count;
    
    // --- [ إعدادات معقولة ديال السبام ] ---
    const timeLimit = 10000; // 10 ثواني (بزاف على الهضرة العادية)
    const messageLimit = 6;  // كتر من 6 ميساجات فهاد الوقت = طيارة

    if (messages > messageLimit && timePassed < timeLimit) {
      // حماية المطورين (باش ما تجريش على راسك ههه)
      const adminBot = global.GoatBot.config.adminBot || [];
      if (adminBot.includes(senderID)) return;

      api.removeUserFromGroup(senderID, threadID, async (err) => {
        if (err) {
          console.error("SpamKick Error:", err);
        } else {
          const name = await usersData.getName(senderID);
          const msg = `⚠️ [ 𝗭𝗬𝗣𝗛𝗘𝗥 𝗔𝗡𝗧𝗜-𝗦𝗣𝗔𝗠 ]\n━━━━━━━━━━━━\n👤 العضو: ${name}\n🆔 الأيدي: ${senderID}\n🚫 السبب: رصد نشاط سبام (قرطاسة).\n━━━━━━━━━━━━\n✅ أي أدمين يدير Reaction لهاد الميساج باش يرجعو.`;
          
          api.sendMessage(msg, threadID, (error, info) => {
            if (!error) {
              global.GoatBot.onReaction.set(info.messageID, { 
                commandName, 
                uid: senderID,
                messageID: info.messageID
              });
            }
          });
        }
      });
      // ريستارت للحساب من بعد الـ Kick
      threadInfo.users[senderID] = { count: 1, time: Date.now() };
    } else if (timePassed > timeLimit) {
      // إيلا فات الوقت وبنادم مفراني، ريستارت للحساب
      threadInfo.users[senderID] = { count: 1, time: Date.now() };
    }
  }

  global.antispam.set(threadID, threadInfo);
};

module.exports.onReaction = async ({ api, event, Reaction, threadsData, usersData, role }) => {
  const { uid, messageID } = Reaction;
  const { threadID } = event;
  
  // غير اللي عندو الصلاحية (Role 1+) هو اللي يرجعو
  if (role < 1) return;

  try {
    await api.addUserToGroup(uid, threadID);
    api.unsendMessage(messageID); // مسح ميساج الإنذار مورا ما يرجع
    console.log(`[ZYPHER] User ${uid} re-added by reaction.`);
  } catch (err) {
    api.sendMessage(`❌ تعذر إرجاع العضو، يقدر يكون بلوكا البوت.`, threadID);
  }
};

module.exports.onStart = async ({ api, event, args }) => {
  const { threadID, messageID } = event;
  if (!global.antispam) global.antispam = new Map();

  switch (args[0]?.toLowerCase()) {
    case "on":
      global.antispam.set(threadID, { users: {} });
      api.sendMessage("🛡️ نظام Anti-Spam شغال دابا فـ هاد لڭروب.\n(6 ميساجات فـ 10 ثواني = Kick)", threadID, messageID);
      break;
    case "off":
      if (global.antispam.has(threadID)) {
        global.antispam.delete(threadID);
        api.sendMessage("✅ تم إيقاف نظام الـ Anti-Spam بصمت.", threadID, messageID);
      } else {
        api.sendMessage("❌ النظام أصلاً ما شاعلش هنا.", threadID, messageID);
      }
      break;
    default:
      api.sendMessage("🛠️ استعمال الأمر: .spamkick [on/off]", threadID, messageID);
  }
};
