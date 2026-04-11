const { createCanvas, loadImage, registerFont } = require("canvas");
const axios = require("axios");
const path = require("path");
const fs = require("fs-extra");

module.exports = {
	config: {
		name: "welcome",
		version: "2.0.0",
		author: "Hanji (Zypher Mod)",
		category: "events"
	},

	onStart: async ({ threadsData, event, api, usersData }) => {
		if (event.logMessageType !== "log:subscribe") return;

		const { threadID } = event;
		const botID = api.getCurrentUserID();
		const addedParticipants = event.logMessageData.addedParticipants;

		// إيلا كان العضو الجديد هو البوت، ما يصيفط والو أو يدير حاجة خرى
		if (addedParticipants.some(i => i.userFbId == botID)) return;

		try {
			const threadData = await threadsData.get(threadID);
			if (threadData.settings.sendWelcomeMessage == false) return;

			for (const user of addedParticipants) {
				const userID = user.userFbId;
				const userName = user.fullName;
				const inviterID = event.author; // اللي زاد العضو
				const inviterName = await usersData.getName(inviterID) || "Admin";
				const memberCount = (await api.getThreadInfo(threadID)).participantIDs.length;

				// 🎨 [ رسم التصويرة ]
				const canvas = createCanvas(1000, 500);
				const ctx = canvas.getContext("2d");

				// 1. الخلفية (دير رابط تصويرة خلفية cyberpunk هنا)
				const background = await loadImage("https://i.imgur.com/vHpxr8A.jpg");
				ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

				// 2. اللوغو ديال زيفر فالوسط (أو أي لوغو)
				const logo = await loadImage("https://i.imgur.com/T09qC03.png");
				ctx.drawImage(logo, 435, 185, 130, 130);

				// 3. رسم دوائر الأفاتار
				async function drawAvatar(id, x, y, label, name) {
					ctx.save();
					ctx.beginPath();
					ctx.arc(x, y, 90, 0, Math.PI * 2, true);
					ctx.lineWidth = 8;
					ctx.strokeStyle = "#00d4ff";
					ctx.stroke();
					ctx.clip();
					const avatar = await loadImage(`https://graph.facebook.com/${id}/picture?width=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`);
					ctx.drawImage(avatar, x - 90, y - 90, 180, 180);
					ctx.restore();

					// السمية والعنوان (New User / Added By)
					ctx.fillStyle = "#ffffff";
					ctx.font = "bold 25px Arial";
					ctx.textAlign = "center";
					ctx.fillText(label, x, y + 130);
					ctx.fillStyle = "#00d4ff";
					ctx.font = "bold 35px Arial";
					ctx.fillText(name, x, y + 170);
				}

				await drawAvatar(userID, 250, 230, "NEW USER", userName.split(" ")[0]);
				await drawAvatar(inviterID, 750, 230, "ADDED BY", inviterName.split(" ")[0]);

				// 4. نصوص إضافية
				ctx.fillStyle = "#ffffff";
				ctx.font = "bold 60px Arial";
				ctx.textAlign = "center";
				ctx.fillText("Welcome To", 500, 100);

				ctx.fillStyle = "#ffffff";
				ctx.font = "30px Arial";
				ctx.fillText(`You are the ${memberCount}st Member`, 500, 450);

				// إرسال التصويرة
				const imagePath = path.join(__dirname, "cache", `welcome_${userID}.png`);
				fs.writeFileSync(imagePath, canvas.toBuffer());

				api.sendMessage({
					body: `Welcome to our sector, ${userName}!`,
					attachment: fs.createReadStream(imagePath)
				}, threadID, () => fs.unlinkSync(imagePath));
			}
		} catch (e) {
			console.error("Welcome Error:", e);
		}
	}
};
