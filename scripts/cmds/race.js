const axios = require("axios");
const fs = require("fs");
const path = require("path");
const Canvas = require("canvas");

// --- 1. قاعدة بيانات الإيموجي ---
const emojiDatabase = [
    ["🍎", "تفاحة"], ["🚗", "سيارة"], ["🦁", "أسد"], ["🌙", "قمر"],
    ["🍕", "بيتزا"], ["⚽", "كرة"], ["💎", "الماسة"], ["💡", "مصباح"],
    ["⏰", "ساعة"], ["🍦", "آيس كريم"], ["🎁", "هدية"], ["🎈", "بالون"],
    ["🍉", "بطيخ"], ["🍇", "عنب"], ["🍓", "فراولة"], ["🍌", "موز"],
    ["🚁", "مروحية"], ["✈️", "طائرة"], ["🚲", "دراجة"], ["🚀", "صاروخ"],
    ["🐱", "قطة"], ["🐶", "كلب"], ["🦊", "ثعلب"], ["🐻", "دب"],
    ["🐼", "باندا"], ["🐯", "نمر"], ["🦋", "فراشة"], ["🐢", "سلحفاة"],
    ["📱", "هاتف"], ["💻", "حاسوب"], ["⌚", "ساعة يد"], ["📷", "كاميرا"],
    ["🍔", "برجر"], ["🍟", "بطاطس"], ["🍩", "دونات"], ["🍫", "شوكولاتة"],
    ["☀️", "شمس"], ["⭐", "نجمة"], ["🔥", "نار"], ["💧", "قطرة ماء"],
    ["🏹", "قوس"], ["🛡️", "درع"], ["👑", "تاج"], ["🔑", "مفتاح"]
];

const SCORE_TO_WIN = 10; 

module.exports = {
    config: {
        name: "race",
        version: "5.0",
        author: "Hanji & Gemini",
        countDown: 5,
        role: 0,
        description: { en: "سباق إيموجي سريع: تسجيل بالتفاعل، لعب، وتكريم بصورة البروفايل" },
        category: "GAMES",
        guide: { en: "اكتب {pn} للبدء، رد بـ 'أنا' للتسجيل، واكتب 'تم' للبدء" }
    },

    onStart: async function ({ message, event, threadsData }) {
        const { threadID, senderID } = event;

        const isRunning = await threadsData.get(threadID, "data.emojiRace_Running");
        if (isRunning) return message.reply("⚠️ اللعبة جارية بالفعل!");

        await threadsData.set(threadID, true, "data.emojiRace_Running");
        await threadsData.set(threadID, senderID, "data.emojiRace_Host");
        await threadsData.set(threadID, [], "data.emojiRace_Players");
        await threadsData.set(threadID, {}, "data.emojiRace_Scores");
        await threadsData.set(threadID, 'registering', "data.emojiRace_Status");

        return message.reply(`🏁 *بدأ تسجيل لعبة تخمين الإيموجي* 🏁\n\n- للمشاركة: اكتب "أنا" \n- لبدء اللعب: يجب على صاحب الأمر كتابة "تم" 🚀`);
    },

    onChat: async function ({ event, threadsData, usersData, message, api }) {
        const { threadID, senderID, body, messageID } = event;
        if (!body) return;

        const gameStatus = await threadsData.get(threadID, "data.emojiRace_Status");
        if (!gameStatus || gameStatus === 'idle') return;

        const text = body.toLowerCase().trim();

        if (gameStatus === 'registering') {
            const hostID = await threadsData.get(threadID, "data.emojiRace_Host");
            const currentPlayers = await threadsData.get(threadID, "data.emojiRace_Players");

            if (text === "أنا") {
                if (!currentPlayers.includes(senderID)) {
                    currentPlayers.push(senderID);
                    await threadsData.set(threadID, currentPlayers, "data.emojiRace_Players");
                    
                    const currentScores = await threadsData.get(threadID, "data.emojiRace_Scores");
                    currentScores[senderID] = 0;
                    await threadsData.set(threadID, currentScores, "data.emojiRace_Scores");

                    return api.setMessageReaction("✅", messageID, (err) => {}, true);
                }
            }

            if (text === "تم" && senderID === hostID) {
                if (currentPlayers.length < 2) return message.reply("⚠️ نحتاج لاعبين على الأقل!");
                
                await threadsData.set(threadID, 'playing', "data.emojiRace_Status");
                message.reply(`🎮 انطلق السباق! أول من يجمع ${SCORE_TO_WIN} نقاط يفوز بالجائزة الملكية! 🏆`);
                
                setTimeout(() => sendNextEmoji(threadID, message, threadsData), 1000);
            }
            return;
        }

        if (gameStatus === 'playing') {
            const correctAnswer = await threadsData.get(threadID, "data.emojiRace_CurrentAnswer");
            if (!correctAnswer) return;

            if (text === correctAnswer) {
                const currentPlayers = await threadsData.get(threadID, "data.emojiRace_Players");
                if (!currentPlayers.includes(senderID)) return;

                await threadsData.set(threadID, null, "data.emojiRace_CurrentAnswer");

                const currentScores = await threadsData.get(threadID, "data.emojiRace_Scores");
                currentScores[senderID] += 1;
                await threadsData.set(threadID, currentScores, "data.emojiRace_Scores");

                const userData = await usersData.get(senderID);
                const newScore = currentScores[senderID];

                if (newScore >= SCORE_TO_WIN) {
                    return finalizeGame(threadID, senderID, userData.name, message, threadsData);
                }

                let scoreboard = `✨ برافو ${userData.name}! (+1)\n\n📊 *لوحة المتصدرين:* \n`;
                const sorted = currentPlayers.sort((a, b) => currentScores[b] - currentScores[a]);
                
                for (let i = 0; i < sorted.length; i++) {
                    const id = sorted[i];
                    const icon = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "👤";
                    const pData = await usersData.get(id);
                    scoreboard += `${icon} ${pData.name}: ${currentScores[id]} ن\n`;
                }

                message.reply(scoreboard);
                setTimeout(() => sendNextEmoji(threadID, message, threadsData), 800);
            }
        }
    }
};

async function sendNextEmoji(threadID, message, threadsData) {
    const randomIndex = Math.floor(Math.random() * emojiDatabase.length);
    const [icon, name] = emojiDatabase[randomIndex];
    await threadsData.set(threadID, name, "data.emojiRace_CurrentAnswer");
    return message.reply(`⬇️ أسرع تخمين للإيموجي: ⬇️\n\n       【 ${icon} 】       `);
}

async function finalizeGame(threadID, winnerID, winnerName, message, threadsData) {
    try {
        message.reply(`🏆 مبروك للفائز ${winnerName}! جاري تجهيز الجائزة... 🖼️`);

        // --- إعدادات المسار (حسب طلبك) ---
        const cachePath = path.join(global.client.mainPath, "scripts", "cmds", "cache");
        const bgPath = path.join(cachePath, "certificate.png");
        const tempPath = path.join(cachePath, `winner_${winnerID}.png`);

        // --- الإحداثيات (عدلها حسب صورتك) ---
        const avatarSize = 40; 
        const avatarX = 338;    
        const avatarY = 260;    
        // ------------------------------------

        if (!fs.existsSync(bgPath)) {
            resetGame(threadID, threadsData);
            return message.reply(`⚠️ ملف certificate.png غير موجود في المسار:\n${bgPath}`);
        }

        const bgImg = await Canvas.loadImage(bgPath);
        const canvas = Canvas.createCanvas(bgImg.width, bgImg.height);
        const ctx = canvas.getContext("2d");

        ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
        
        const avatarUrl = `https://graph.facebook.com/${winnerID}/picture?width=720&height=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
        const avatarImg = await Canvas.loadImage(avatarUrl);

        ctx.save();
        ctx.beginPath();
        ctx.arc(avatarX + (avatarSize / 2), avatarY + (avatarSize / 2), avatarSize / 2, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatarImg, avatarX, avatarY, avatarSize, avatarSize);
        ctx.restore();

        fs.writeFileSync(tempPath, canvas.toBuffer());

        await message.reply({
            body: `🎉 مبروك يا بطل(ة) اللعبة! 🏆✨`,
            attachment: fs.createReadStream(tempPath)
        });

        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    } catch (e) {
        console.error(e);
        message.reply("❌ حدث خطأ في معالجة الصورة.");
    } finally {
        resetGame(threadID, threadsData);
    }
}

async function resetGame(threadID, threadsData) {
    await threadsData.set(threadID, false, "data.emojiRace_Running");
    await threadsData.set(threadID, 'idle', "data.emojiRace_Status");
    await threadsData.set(threadID, null, "data.emojiRace_CurrentAnswer");
    await threadsData.set(threadID, null, "data.emojiRace_Players");
    await threadsData.set(threadID, null, "data.emojiRace_Scores");
    await threadsData.set(threadID, null, "data.emojiRace_Host");
}

