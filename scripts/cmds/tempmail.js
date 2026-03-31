const axios = require('axios');

module.exports = {
  config: {
    name: "tempmail",
    aliases: ["tm", "mail"],
    version: "4.2",
    author: "Zypher",
    countDown: 5,
    role: 0,
    category: "tools",
    guide: { en: "{pn} : generate mail | {pn} inbox [email] : check inbox" }
  },

  onStart: async ({ api, event, args }) => {
    const { threadID, messageID } = event;
    const API = "https://api.mail.tm";
    const uiBox = (title, msg) => `[ 𝗭𝗬𝗣𝗛𝗘𝗥 - ${title} ]\n╼━━━━━━━━━━━━━━━━━━━━╾\n${msg}\n╼━━━━━━━━━━━━━━━━━━━━╾\n[ 𝗦𝗬𝗦𝗧𝗘𝗠 𝗢𝗣𝗘𝗥𝗔𝗧𝗜𝗢𝗡𝗔𝗟 ]`;

    if (!global.zypherMails) global.zypherMails = {};

    try {
      if (args[0] === "inbox") {
        const email = args[1];
        if (!email) return api.sendMessage(uiBox("𝗠𝗔𝗜𝗟-𝗘𝗥𝗥𝗢𝗥", "❯ Please provide an email address to check the inbox."), threadID, messageID);

        if (!global.zypherMails[email]) {
          return api.sendMessage(uiBox("𝗠𝗔𝗜𝗟-𝗘𝗥𝗥𝗢𝗥", "❯ This email record was not found or has been cleared."), threadID, messageID);
        }

        const password = global.zypherMails[email];
        const tokenRes = await axios.post(`${API}/token`, { address: email, password });
        const token = tokenRes.data.token;

        const inbox = await axios.get(`${API}/messages?page=1`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const messages = inbox.data["hydra:member"];
        if (!messages || messages.length === 0) {
          return api.sendMessage(uiBox("𝗜𝗡𝗕𝗢𝗫", "❯ The inbox is currently empty."), threadID, messageID);
        }

        let out = "";
        messages.forEach((msg) => {
          out += `❯ 𝗙𝗥𝗢𝗠: ${msg.from.address}\n❯ 𝗦𝗨𝗕𝗝𝗘𝗖𝗧: ${msg.subject || "No Subject"}\n❯ 𝗣𝗥𝗘𝗩𝗜𝗘𝗪: ${(msg.intro || "").substring(0, 80)}...\n\n`;
        });

        return api.sendMessage(uiBox("𝗜𝗡𝗕𝗢𝗫-𝗗𝗔𝗧𝗔", out), threadID, messageID);
      }

      api.setMessageReaction("📨", messageID, () => {}, true);
      const domainRes = await axios.get(`${API}/domains`);
      const domain = domainRes.data["hydra:member"][0].domain;

      const randomName = Math.random().toString(36).substring(2, 10);
      const email = `${randomName}@${domain}`;
      const password = randomName + "123";

      await axios.post(`${API}/accounts`, { address: email, password });
      global.zypherMails[email] = password;

      return api.sendMessage(
        uiBox("𝗧𝗘𝗠𝗣-𝗠𝗔𝗜𝗟", 
          `❯ 𝗘𝗠𝗔𝗜𝗟 : ${email}\n` +
          `❯ 𝗣𝗔𝗦𝗦𝗪𝗢𝗥𝗗 : ${password}\n\n` +
          `❯ 𝗖𝗛𝗘𝗖𝗞 : .tm inbox ${email}`),
        threadID, messageID
      );

    } catch (err) {
      return api.sendMessage(uiBox("𝗦𝗬𝗦𝗧𝗘𝗠-𝗙𝗔𝗜𝗟", "❯ Internal error while communicating with mail servers."), threadID, messageID);
    }
  }
};

