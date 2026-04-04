const { getStreamFromURL, uploadImgbb } = global.utils;

module.exports = {
	config: {
		name: "anti", 
		aliases: ["ac", "antichange"],
		version: "3.5",
		author: "𝗦𝗵𝗔𝗻 & Gemini",
		countDown: 5,
		role: 2, // للمطور فقط يتحكم فـ التشغيل/الإيقاف
		description: {
			en: "Anti-change for Group Info (Optimized with Anti-Spam Lock)"
		},
		category: "GROUP",
		guide: {
			en: "   {pn} avt [on | off]\n   {pn} name [on | off]\n   {pn} nc [on | off]"
		}
	},

	onStart: async function ({ message, event, args, threadsData, api }) {
		let option = args[0]?.toLowerCase();
		const status = args[1]?.toLowerCase();

		if (!["on", "off"].includes(status)) return;
		if (option === "nc") option = "nickname";

		const { threadID, messageID } = event;
		const dataAntiChangeInfoBox = await threadsData.get(threadID, "data.antiChangeInfoBox", {});

		async function checkAndSaveData(key, data) {
			if (status === "off")
				delete dataAntiChangeInfoBox[key];
			else
				dataAntiChangeInfoBox[key] = data;

			await threadsData.set(threadID, dataAntiChangeInfoBox, "data.antiChangeInfoBox");
			api.setMessageReaction("🛡️", messageID, () => {}, true);
		}

		switch (option) {
			case "avt":
			case "avatar": {
				const { imageSrc } = await threadsData.get(threadID);
				if (!imageSrc && status === "on") return;
				const newImageSrc = status === "on" ? await uploadImgbb(imageSrc) : null;
				await checkAndSaveData("avatar", newImageSrc ? newImageSrc.image.url : null);
				break;
			}
			case "name": {
				const { threadName } = await threadsData.get(threadID);
				await checkAndSaveData("name", threadName);
				break;
			}
			case "nickname": {
				const { members } = await threadsData.get(threadID);
				const originalNicknames = members.map(user => ({ [user.userID]: user.nickname })).reduce((a, b) => ({ ...a, ...b }), {});
				await checkAndSaveData("nickname", originalNicknames);
				break;
			}
			default: return;
		}
	},

	onEvent: async function ({ event, threadsData, api }) {
		const { threadID, logMessageType, logMessageData, author } = event;
		const botID = api.getCurrentUserID();

		// 1. لا نتدخل إذا كان المغير هو البوت (منع التكرار اللانهائي)
		if (author === botID) return;

		const dataAntiChange = await threadsData.get(threadID, "data.antiChangeInfoBox", {});
		const adminBot = global.GoatBot.config.adminBot || [];
		
		// 🛡️ فحص الصلاحية: هل المغير مطور للبوت؟
		const isBotAdmin = adminBot.includes(author);

		switch (logMessageType) {
			case "log:thread-image": {
				if (!dataAntiChange.avatar) return;
				if (!isBotAdmin) {
					api.changeGroupImage(await getStreamFromURL(dataAntiChange.avatar), threadID);
				} else {
					const imageSrc = logMessageData.url;
					if (imageSrc) {
						const newImg = await uploadImgbb(imageSrc);
						await threadsData.set(threadID, newImg.image.url, "data.antiChangeInfoBox.avatar");
					}
				}
				break;
			}

			case "log:thread-name": {
				if (!dataAntiChange.hasOwnProperty("name")) return;

				// --- [ 🔒 نظام منع الهيستيريا / 𝗔𝗻𝘁𝗶-𝗦𝗽𝗮𝗺 𝗟𝗼𝗰𝗸 ] ---
				if (!global.antiNameLock) global.antiNameLock = {};
				const now = Date.now();
				const lastAction = global.antiNameLock[threadID] || 0;

				// إذا تم تغيير الاسم في أقل من 5 ثوانٍ، نتجاهل الحدث
				if (now - lastAction < 1500) return;

				const newName = logMessageData.name;
				const oldName = dataAntiChange.name;

				// إذا كان الاسم الجديد هو نفسه القديم (تم إرجاعه بالفعل)، نسكت
				if (newName === oldName) return;

				if (!isBotAdmin) {
					global.antiNameLock[threadID] = now; // تفعيل القفل الزمني
					api.setTitle(oldName, threadID, (err) => {
						if (!err) api.setMessageReaction("🛡️", event.messageID, () => {}, true);
					});
				} else {
					// تحديث قاعدة البيانات إذا كان المغير هو المطور
					await threadsData.set(threadID, newName, "data.antiChangeInfoBox.name");
				}
				break;
			}

			case "log:user-nickname": {
				if (!dataAntiChange.hasOwnProperty("nickname")) return;
				const { nickname, participant_id } = logMessageData;
				const oldNick = dataAntiChange.nickname[participant_id] || "";

				if (nickname === oldNick) return;

				if (!isBotAdmin) {
					api.changeNickname(oldNick, threadID, participant_id);
				} else {
					await threadsData.set(threadID, nickname, `data.antiChangeInfoBox.nickname.${participant_id}`);
				}
				break;
			}
		}
	}
};

