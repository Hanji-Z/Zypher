const fs = require("fs");
const path = require("path");
const { downloadVideo } = require("sagor-video-downloader");

module.exports = {
    config: {
        name: "autolink",
        version: "2.1.0",
        author: "Hanji x Zypher",
        countDown: 5,
        role: 0,
        category: "media",
    },

    onStart: async function () {},

    onChat: async function ({ api, event }) {
        const { threadID, messageID, body, senderID } = event;
        const botID = api.getCurrentUserID();

        // 🛡️ الحماية من التكرار اللانهائي (Anti-Loop)
        if (senderID === botID || !body) return;

        const sidebar = "█║ ";
        const line = "█║──────────────────";
        
        // اكتشاف الروابط (TikTok, FB, IG, YT...)
        const linkMatches = body.match(/(https?:\/\/[^\s]+)/g);
        if (!linkMatches) return;

        const uniqueLinks = [...new Set(linkMatches)];
        
        // تفاعل بالانتظار
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
                    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                    continue;
                }

                await api.sendMessage({
                    body: `${sidebar}𝗭𝗬𝗣𝗛𝗘𝗥 𝗗𝗢𝗪𝗡𝗟𝗢𝗔𝗗𝗘𝗥\n` +
                          `${line}\n` +
                          `${sidebar}◈ 𝗦𝗧𝗔𝗧𝗨𝗦: Success\n` +
                          `${sidebar}◈ 𝗦𝗜𝗭𝗘: ${fileSizeInMB.toFixed(2)} MB\n` +
                          `${sidebar}◈ 𝗕𝗬: hanji\n` +
                          `${line}\n` +
                          `${sidebar}[ 𝗦𝗬𝗦𝗧𝗘𝗠 𝗢𝗣𝗘𝗥𝗔𝗧𝗜𝗢𝗡𝗔𝗟 ]`,
                    attachment: fs.createReadStream(filePath)
                }, threadID, () => {
                    // مسح الملف مورا ما يتصيفط باش ما يعمرش السيرفر
                    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                });

                api.setMessageReaction("✅", messageID, () => {}, true);

            } catch (err) {
                console.error("Zypher Autolink Error:", err.message);
                api.setMessageReaction("❌", messageID, () => {}, true);
            }
        }
    }
};
