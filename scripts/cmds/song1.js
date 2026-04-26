Enterconst fs = require("fs-extra");
const path = require("path");
const yts = require("yt-search");
const ytdl = require("@distube/ytdl-core");

module.exports = {
  config: {
    name: "song1",
    aliases: ["0", "غني"],
    version: "3.5.0",
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

    // 🔍 Search Reaction
    api.setMessageReaction("🔍", messageID, () => {}, true);

    try {
      const searchResult = await yts(songName);
      const video = searchResult.videos[0];

      if (!video) {
        api.setMessageReaction("❌", messageID, () => {}, true);
        return;
      }

      // 📥 Downloading Reaction
      api.setMessageReaction("📥", messageID, () => {}, true);

      const filePath = path.join(__dirname, "cache", `${Date.now()}.mp3`);
      
      // 🍪 Cookie Configuration
      const cookiePath = path.join(process.cwd(), "youtube_cookies.json");
      let options = {
        filter: "audioonly",
        quality: "highestaudio",
      };

      if (fs.existsSync(cookiePath)) {
        try {
          const jsonCookies = JSON.parse(fs.readFileSync(cookiePath, "utf-8"));
          const cookieString = jsonCookies.map(c => `${c.name}=${c.value}`).join('; ');
          options.requestOptions = { headers: { cookie: cookieString } };
        } catch (e) {
          console.error("[ ZYPHER ] Cookie Error:", e.message);
        }
      }

      // 🛠️ Download Process
      const stream = ytdl(video.url, options);
      const writer = fs.createWriteStream(filePath);
      stream.pipe(writer);

      writer.on('finish', () => {
        // ✅ Success Reaction
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
        console.error(err);
        api.setMessageReaction("❌", messageID, () => {}, true);
      });

    } catch (error) {
      console.error(error);
      api.setMessageReaction("⚠️", messageID, () => {}, true);
    }
  }
};
