const { getStreamFromURL, uploadImgbb } = global.utils;

module.exports = {
	config: {
		name: "anti", 
		aliases: ["ac", "antichange"],
		version: "2.1",
		author: "𝗦𝗵𝗔𝗻 & Gemini",
		countDown: 5,
		role: 2,
		description: {
			en: "Anti change info box - Original Logic with 🥴 reaction"
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
			// التفاعل بالإيموجي عند التفعيل أو الإيقاف
			api.setMessageReaction("🥴", messageID, () => {}, true);
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
				// --- العودة للمنطق الأصلي تماماً لسحب الكنيات ---
				const { members } = await threadsData.get(threadID);
				const originalNicknames = members.map(user => ({ [user.userID]: user.nickname })).reduce((a, b) => ({ ...a, ...b }), {});
				await checkAndSaveData("nickname", originalNicknames);
				break;
			}
			default: return;
		}
	},

	onEvent: async function ({ event, threadsData, role, api }) {
		const { threadID, logMessageType, logMessageData, author } = event;
		const botID = api.getCurrentUserID();

		// لا نتدخل إذا كان المغير هو البوت
		if (author === botID) return;

		const dataAntiChange = await threadsData.get(threadID, "data.antiChangeInfoBox", {});

		switch (logMessageType) {
			case "log:thread-image": {
				if (!dataAntiChange.avatar) return;
				if (role < 1) {
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
				if (role < 1) {
					api.setTitle(dataAntiChange.name, threadID);
				} else {
					await threadsData.set(threadID, logMessageData.name, "data.antiChangeInfoBox.name");
				}
				break;
			}
			case "log:user-nickname": {
				// --- العودة للمنطق الأصلي تماماً لإرجاع الكنية ---
				if (!dataAntiChange.hasOwnProperty("nickname")) return;
				const { nickname, participant_id } = logMessageData;

				if (role < 1) {
					// إرجاع الكنية من القاموس الأصلي المحفوظ
					const oldNick = dataAntiChange.nickname[participant_id] || "";
					api.changeNickname(oldNick, threadID, participant_id);
				} else {
					// تحديث الكنية الجديدة في قاعدة البيانات إذا غيرها الأدمن
					await threadsData.set(threadID, nickname, `data.antiChangeInfoBox.nickname.${participant_id}`);
				}
				break;
			}
		}
	}
};

