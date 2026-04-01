const axios = require("axios");

module.exports = {
  config: {
    name: "akinator",
    aliases: ["aki", "المارد"],
    version: "3.0.0",
    author: "Zypher",
    countDown: 5,
    role: 0,
    category: "GAME",
    shortDescription: { en: "Play a full game with Akinator in Arabic" },
    guide: { en: "{pn} | Answer by replying with the option number." }
  },

  onStart: async function ({ api, event, commandName }) {
    const { threadID, messageID, senderID } = event;
    const sidebar = "█║ ";
    const line = "█║──────────────────";

    try {
      api.setMessageReaction("🔮", messageID, () => {}, true);
      
      // البداية: طلب أول سؤال من الـ API
      const res = await axios.get("https://api.manh.pro/aki/start?lang=ar");
      const { session, signature, step, question } = res.data;

      const introMsg = `🧞‍♂️ [ 𝗔𝗞𝗜𝗡𝗔𝗧𝗢𝗥 𝗚𝗘𝗡𝗜𝗘 ]\n${line}\n` +
                       `${sidebar}أنا المارد العبقري، فكر فـ شي شخصية...\n` +
                       `${line}\n` +
                       `${sidebar}🤔 السؤال: **${question}**\n\n` +
                       `${sidebar}0. نعم (Yes)\n` +
                       `${sidebar}1. لا (No)\n` +
                       `${sidebar}2. لا أعلم (Don't Know)\n` +
                       `${sidebar}3. ممكن (Probably)\n` +
                       `${sidebar}4. ممكن لا (Probably Not)\n${line}\n` +
                       `${sidebar}💡 جاوب بـ **رقم الاختيار** (Reply)`;

      return api.sendMessage(introMsg, threadID, (err, info) => {
        global.GoatBot.onReply.set(info.messageID, {
          commandName,
          messageID: info.messageID,
          author: senderID,
          session,
          signature,
          step
        });
      }, messageID);

    } catch (e) {
      return api.sendMessage(sidebar + "❌ المارد عيان شوية دابا، جرب من بعد!", threadID, messageID);
    }
  },

  onReply: async function ({ api, event, Reply, commandName }) {
    const { threadID, messageID, body, senderID } = event;
    const { session, signature, step, author } = Reply;
    const sidebar = "█║ ";
    const line = "█║──────────────────";

    if (senderID !== author) return; // غير اللي بدا اللعبة هو اللي يجاوب

    const answer = body.trim();
    if (isNaN(answer) || answer < 0 || answer > 4) {
      return api.sendMessage(sidebar + "⚠️ عفاك جاوب غير بـ الرقم (0، 1، 2، 3، 4)", threadID, messageID);
    }

    try {
      api.setMessageReaction("🔄", messageID, () => {}, true);

      // إرسال الجواب للـ API
      const res = await axios.get(`https://api.manh.pro/aki/answer?session=${session}&signature=${signature}&step=${step}&answer=${answer}&lang=ar`);
      const data = res.data;

      // إيلا كان الـ Progress فات 85%، يعني المارد عرف الشخصية
      if (data.progress >= 85 || data.step >= 30) {
        const guessRes = await axios.get(`https://api.manh.pro/aki/guess?session=${session}&signature=${signature}&lang=ar`);
        const result = guessRes.data.answers[0];

        const winMsg = `🧞‍♂️ [ 𝗔𝗞𝗜𝗡𝗔𝗧𝗢𝗥 𝗚𝗨𝗘𝗦𝗦 ]\n${line}\n` +
                       `${sidebar}واش هي: **${result.name}**؟\n` +
                       `${sidebar}وصف: ${result.description}\n${line}\n` +
                       `${sidebar}ناضي ياك؟ 😏🔥`;

        return api.sendMessage({
          body: winMsg,
          attachment: await global.utils.getStreamFromURL(result.image)
        }, threadID, messageID);
      }

      // إيلا مازال ما عرفش، كمل الأسئلة
      const nextMsg = `🧞‍♂️ [ 𝗔𝗞𝗜𝗡𝗔𝗧𝗢𝗥 - 𝗦𝗧𝗘𝗣 ${parseInt(data.step) + 1} ]\n${line}\n` +
                      `${sidebar}🤔 السؤال: **${data.question}**\n${line}\n` +
                      `${sidebar}0. نعم | 1. لا | 2. ماعرفتش\n` +
                      `${sidebar}3. ممكن | 4. ممكن لا\n${line}\n` +
                      `${sidebar}📊 التقدم: ${Math.round(data.progress)}%`;

      api.unsendMessage(Reply.messageID); // حيد الميساج القديم باش ما تروونش الشات

      return api.sendMessage(nextMsg, threadID, (err, info) => {
        global.GoatBot.onReply.set(info.messageID, {
          commandName,
          messageID: info.messageID,
          author: senderID,
          session,
          signature,
          step: data.step
        });
      }, messageID);

    } catch (e) {
      return api.sendMessage(sidebar + "❌ وقع مشكل فـ السيرفر ديال المارد.", threadID, messageID);
    }
  }
};
