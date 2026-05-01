const axios = require('axios');

const API = "https://api.tempmail.lol";
const uiBox = (title, msg) =>
  `[ 𝗭𝗬𝗣𝗛𝗘𝗥 - ${title} ]\n╼━━━━━━━━━━━━━━━━━━━━╾\n${msg}\n╼━━━━━━━━━━━━━━━━━━━━╾\n[ 𝗦𝗬𝗦𝗧𝗘𝗠 𝗢𝗣𝗘𝗥𝗔𝗧𝗜𝗢𝗡𝗔𝗟 ]`;

module.exports = {
  config: {
    name: "tempmail",
    aliases: ["tm", "mail"],
    version: "5.0",
    author: "Zypher",
    countDown: 5,
    role: 0,
    category: "tools",
    guide: { en: "{pn} : generate mail | {pn} inbox [email] : check inbox" }
  },

  onStart: async ({ api, event, args }) => {
    const { threadID, messageID } = event;

    if (!global.zypherMails) global.zypherMails = {};

    try {
      // ====== فحص الـ inbox ======
      if (args[0] === "inbox") {
        const email = args[1];
        if (!email) {
          return api.sendMessage(
            uiBox("𝗠𝗔𝗜𝗟-𝗘𝗥𝗥𝗢𝗥", "❯ حدد الإيميل اللي بغي تفحص inbox ديالو.\n❯ مثال: .tm inbox aaa@cloudvxz.com"),
            threadID, messageID
          );
        }

        const record = global.zypherMails[email];
        if (!record) {
          return api.sendMessage(
            uiBox("𝗠𝗔𝗜𝗟-𝗘𝗥𝗥𝗢𝗥", "❯ هذا الإيميل ما كاينش أو انتهى.\n❯ ولد إيميل جديد بـ .tm"),
            threadID, messageID
          );
        }

        const inboxRes = await axios.get(`${API}/auth/${record.token}`, { timeout: 15000 });
        const messages = inboxRes.data?.email || [];

        if (messages.length === 0) {
          return api.sendMessage(
            uiBox("𝗜𝗡𝗕𝗢𝗫", "❯ الـ inbox فارغ دابا.\n❯ استنى شوية وعاود فحص."),
            threadID, messageID
          );
        }

        let out = "";
        messages.forEach((msg, i) => {
          const from = msg.from || "Unknown";
          const subject = msg.subject || "No Subject";
          const preview = (msg.body_text || msg.body || "").substring(0, 120).replace(/\n/g, " ");
          out += `❯ [${i + 1}] 𝗙𝗥𝗢𝗠: ${from}\n❯ 𝗦𝗨𝗕𝗝𝗘𝗖𝗧: ${subject}\n❯ 𝗣𝗥𝗘𝗩𝗜𝗘𝗪: ${preview}\n\n`;
        });

        return api.sendMessage(uiBox("𝗜𝗡𝗕𝗢𝗫-𝗗𝗔𝗧𝗔", out.trim()), threadID, messageID);
      }

      // ====== توليد إيميل جديد ======
      api.setMessageReaction("📨", messageID, () => {}, true);

      const genRes = await axios.get(`${API}/generate`, { timeout: 15000 });
      const { address, token } = genRes.data;

      if (!address || !token) throw new Error("API ما رجعتش إيميل صالح");

      global.zypherMails[address] = { token };

      return api.sendMessage(
        uiBox("𝗧𝗘𝗠𝗣-𝗠𝗔𝗜𝗟",
          `❯ 𝗘𝗠𝗔𝗜𝗟   : ${address}\n\n` +
          `❯ 𝗖𝗛𝗘𝗖𝗞  : .tm inbox ${address}\n\n` +
          `❯ ملاحظة: الإيميل يبقى نشيط 10 دقايق`
        ),
        threadID, messageID
      );

    } catch (err) {
      console.error("TempMail Error:", err.message);
      return api.sendMessage(
        uiBox("𝗦𝗬𝗦𝗧𝗘𝗠-𝗙𝗔𝗜𝗟", "❯ حدث خطأ في الاتصال بسيرفر الإيميل.\n❯ عاود المحاولة."),
        threadID, messageID
      );
    }
  }
};
