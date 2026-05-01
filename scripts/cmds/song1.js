const fs = require("fs-extra");
const path = require("path");
const { exec } = require("child_process");
const yts = require("youtube-search-api");

module.exports = {
  config: {
    name: "play",
    version: "3.0.0",
    role: 0,
    author: "Hanji",
    description: { en: "Download music directly using yt-dlp" },
    category: "Music",
    guide: { en: "{pn} [song name]" },
    countDown: 10
  },

  onStart: async function ({ api, event, args, message }) {
    const { threadID, messageID } = event;
    const query = args.join(" ");

    if (!query) return message.reply("🎵 عطيني سمية الأغنية أ سيدي هانجي!");

    const cachePath = path.join(__dirname, "cache", `sing_${Date.now()}.mp3`);
    if (!fs.existsSync(path.join(__dirname, "cache"))) fs.mkdirSync(path.join(__dirname, "cache"));

    message.reply("🔍 جاري البحث والتحميل... صبراً جميلاً.");
    api.setMessageReaction("🔍", messageID, () => {}, true);

    try {
      // 1. البحث عن الفيديو
      const search = await yts.GetListByKeyword(query, false, 1);
      const video = search.items[0];
      if (!video) return message.reply("❌ مالقيت والو، جرب سمية أخرى.");

      const videoUrl = `https://www.youtube.com/watch?v=${video.id}`;
      
      // 2. التحميل باستخدام yt-dlp (Direct command)
      // -x: extract audio | --audio-format mp3
      const cmd = `yt-dlp -x --audio-format mp3 --audio-quality 0 --output "${cachePath.replace('.mp3', '.%(ext)s')}" "${videoUrl}"`;

      exec(cmd, async (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${error.message}`);
            api.setMessageReaction("❌", messageID, () => {}, true);
            return message.reply("❌ وقع مشكل فـ التحميل. تأكد بلي yt-dlp كاين فـ السيرفر.");
        }

        if (fs.existsSync(cachePath)) {
          api.setMessageReaction("✅", messageID, () => {}, true);
          await message.reply({
            body: `🎵 تم التحميل أ سيدي هانجي:\n📌 العنوان: ${video.title}\n⏱️ المدى: ${video.length.simpleText}`,
            attachment: fs.createReadStream(cachePath)
          });
          fs.unlinkSync(cachePath); // مسح الملف مورا ما يتصيفط
        } else {
          message.reply("❌ تعذر العثور على الملف بعد التحميل.");
        }
      });

    } catch (err) {
      console.error(err);
      message.reply("❌ كاين شي خلل فـ سكريبت البحث.");
    }
  }
};

