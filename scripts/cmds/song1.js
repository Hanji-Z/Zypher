const fs = require("fs-extra");
const path = require("path");
const yts = require("yt-search");
const ytdl = require("@distube/ytdl-core");

module.exports = {
  config: {
    name: "song1",
    aliases: ["0", "غني"],
    version: "3.8.0",
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
        return message.reply("عطيني سمية الأغنية أ هانجي!");
    }

    api.setMessageReaction("🔍", messageID, () => {}, true);

    try {
      const searchResult = await yts(songName);
      const video = searchResult.videos[0];

      if (!video) {
        api.setMessageReaction("❌", messageID, () => {}, true);
        return message.reply("مالقيت والو، تأكد من السمية.");
      }

      api.setMessageReaction("📥", messageID, () => {}, true);

      const cachePath = path.join(__dirname, "cache");
      if (!fs.existsSync(cachePath)) fs.mkdirSync(cachePath);
      const filePath = path.join(cachePath, `${Date.now()}.mp3`);

      // 🍪 Agent Configuration
      const cookiePath = path.join(process.cwd(), "cookies.json");
      let agent;
      if (fs.existsSync(cookiePath)) {
        try {
          const jsonCookies = JSON.parse(fs.readFileSync(cookiePath, "utf-8"));
          agent = ytdl.createAgent(jsonCookies);
        } catch (e) {
          console.error("[ ZYPHER ] Cookie Error:", e.message);
        }
      }

      // 🛠️ Simple & Stable Options
      const options = {
        agent,
        filter: 'audioonly',
        highWaterMark: 1 << 25
      };

      const stream = ytdl(video.url, options);
      const writer = fs.createWriteStream(filePath);
      
      stream.pipe(writer);

      stream.on('error', (err) => {
        console.error("[ YTDL ERROR ]", err);
        api.setMessageReaction("❌", messageID, () => {}, true);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      });

      writer.on('finish', () => {
        api.setMessageReaction("✅", messageID, () => {}, true);
        
        const decorativeMsg = `​[ 𝗭𝗬𝗣𝗛𝗘𝗥 𝗦𝗬𝗦𝗧𝗘𝗠 - 𝗠𝗨𝗦𝗜𝗖 ]
╼━━━━━━━━━━━━━━━━━━━━╾
​❯ [𝗧𝗜𝗧𝗟𝗘] : ${video.title}
❯ [𝗗𝗨𝗥𝗔𝗧𝗜𝗢𝗡] : ${video.duration.timestamp}
❯ [𝗔𝗥𝗧𝗜𝗦𝗧] : ${video.author.name}
​╼━━━━━━━━━━━━━━━━━━━━╾
[ 𝗔𝗖𝗖𝗘𝗦𝗦 𝗚𝗥𝗔𝗡𝗧𝗘𝗗 - 𝗛𝗔𝗡𝗝𝗜 ]`;

        message.reply({
          body: decorativeMsg,
          attachment: fs.createReadStream(filePath)
        }, () => {
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        });
      });

    } catch (error) {
      console.error("[ ZYPHER CRITICAL ERROR ]", error);
      api.setMessageReaction("⚠️", messageID, () => {}, true);
    }
  }
};
