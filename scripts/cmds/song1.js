const fs = require("fs-extra");
const path = require("path");
const yts = require("yt-search");
const ytdl = require("@distube/ytdl-core");

module.exports = {
  config: {
    name: "song1",
    aliases: ["0", "غني"],
    version: "3.6.0",
    author: "Hanji",
    countDown: 10,
    role: 0,
    shortDescription: "Download music with Zypher signature style",
    category: "media",
    guide: "{pn} [song name]"
  },

  onStart: async function ({ api, event, args, message }) {
    const { threadID, messageID } = event;
    const songName = args.join(" ");

    if (!songName) {
        api.setMessageReaction("⚠️", messageID, () => {}, true);
        return;
    }

    api.setMessageReaction("🔍", messageID, () => {}, true);

    try {
      const searchResult = await yts(songName);
      const video = searchResult.videos[0];

      if (!video) {
        api.setMessageReaction("❌", messageID, () => {}, true);
        return;
      }

      api.setMessageReaction("📥", messageID, () => {}, true);

      const filePath = path.join(__dirname, "cache", `${Date.now()}.mp3`);
      if (!fs.existsSync(path.join(__dirname, "cache"))) fs.mkdirSync(path.join(__dirname, "cache"));

      // 🍪 New Agent Logic (The Secret Sauce)
      const cookiePath = path.join(process.cwd(), "cookies.json"); // تأكد من اسم الملف عندك
      let options = {
        filter: "audioonly",
        quality: "highestaudio",
        highWaterMark: 1 << 25
      };

      if (fs.existsSync(cookiePath)) {
        try {
          const jsonCookies = JSON.parse(fs.readFileSync(cookiePath, "utf-8"));
          // هادي هي اللعيبة لي كتحل المشكل
          options.agent = ytdl.createAgent(jsonCookies);
        } catch (e) {
          console.error("[ ZYPHER ] Cookie/Agent Error:", e.message);
        }
      }

      const stream = ytdl(video.url, options);
      const writer = fs.createWriteStream(filePath);
      stream.pipe(writer);

      writer.on('finish', () => {
        api.setMessageReaction("✅", messageID, () => {}, true);
        
        const decorativeMsg = `​[ 𝗭𝗬𝗣𝗛𝗘𝗥 𝗦𝗬𝗦𝗧𝗘𝗠 - 𝗠𝗨𝗦𝗜𝗖 ]
╼━━━━━━━━━━━━━━━━━━━━╾
​❯ [𝗧𝗜𝗧𝗟𝗘] : ${video.title}
❯ [𝗗𝗨𝗥𝗔𝗧𝗜𝗢𝗡] : ${video.duration.timestamp}
❯ [𝗔𝗥𝗧𝗜𝗦𝗧] : ${video.author.name}
​╼━━━━━━━━━━━━━━━━━━━━╾
[ 𝗔𝗖𝗖𝗘𝗦𝗦 𝗚𝗥𝗔𝗡𝗧𝗘𝗗 - 𝗛𝗔𝗡𝗝𝗜 ]`;

        return message.reply({
          body: decorativeMsg,
          attachment: fs.createReadStream(filePath)
        }, () => {
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        });
      });

      stream.on('error', (err) => {
        console.error("[ ZYPHER ERROR ]", err);
        api.setMessageReaction("❌", messageID, () => {}, true);
        message.reply("تعذر تحميل الأغنية، جرب مرة أخرى لاحقاً.");
      });

    } catch (error) {
      console.error(error);
      api.setMessageReaction("⚠️", messageID, () => {}, true);
    }
  }
};
