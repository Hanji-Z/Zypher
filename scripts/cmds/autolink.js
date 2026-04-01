const fs = require("fs");
const path = require("path");
const { downloadVideo } = require("sagor-video-downloader");

module.exports = {
    config: {
        name: "autolink",
        version: "2.0.0",
        author: "Zypher",
        countDown: 5,
        role: 0,
        category: "media",
    },

    onStart: async function () {},

    onChat: async function ({ api, event }) {
        const { threadID, messageID, body } = event;
        const sidebar = "█║ ";
        const line = "█║──────────────────";
        
        if (!body) return;

        // اكتشاف الروابط (TikTok, FB, IG, YT...)
        const linkMatches = body.match(/(https?:\/\/[^\s]+)/g);
        if (!linkMatches) return;

        const uniqueLinks = [...new Set(linkMatches)];
        api.setMessageReaction("⏳", messageID, () => {}, true);

        for (const url of uniqueLinks) {
            try {
                // محاولة التحميل باستعمال المكتبة
                const res = await downloadVideo(url);
                const filePath = res.filePath;

                if (!filePath || !fs.existsSync(filePath)) continue;

                const stats = fs.statSync(filePath);
                const fileSizeInMB = stats.size / (1024 * 1024);

                // Messenger limit is ~25MB
                if (fileSizeInMB > 25) {
                    fs.unlinkSync(filePath);
                    continue;
                }

                await api.sendMessage({
                    body: `${sidebar}𝗭𝗬𝗣𝗛𝗘𝗥 𝗗𝗢𝗪𝗡𝗟𝗢𝗔𝗗𝗘𝗥\n` +
                          `${line}\n` +
                          `${sidebar}◈ 𝗦𝗧𝗔𝗧𝗨𝗦: Success\n` +
                          `${sidebar}◈ 𝗦𝗜𝗭𝗘: ${fileSizeInMB.toFixed(2)} MB\n` +
                          `${line}\n` +
                          `${sidebar}[ 𝗦𝗬𝗦𝗧𝗘𝗠 𝗢𝗣𝗘𝗥𝗔𝗧𝗜𝗢𝗡𝗔𝗟 ]`,
                    attachment: fs.createReadStream(filePath)
                }, threadID, () => {
                    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                });

                api.setMessageReaction("✅", messageID, () => {}, true);

            } catch (err) {
                console.error("Autolink Error:", err.message);
                api.setMessageReaction("❌", messageID, () => {}, true);
            }
        }
    }
};
