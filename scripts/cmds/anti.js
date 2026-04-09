const { getStreamFromURL, uploadImgbb } = global.utils;

module.exports = {
	config: {
		name: "anti", 
		aliases: ["ac", "antichange"],
		version: "4.0",
		author: "𝗦𝗵𝗔𝗻 & Hanji (Gemini)",
		countDown: 5,
		role: 2, 
		description: {
			en: "Anti-change for Group Info with Ghost-NC Shield"
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

    // 🛡️ [ الرادار الجديد ] - كايصيد التغييرات المخفية فـ الكنيات
    onChat: async function ({ event, threadsData, api }) {
        const { threadID, senderID } = event;
        const botID = api.getCurrentUserID();

        if (senderID === botID) return;

        const dataAntiChange = await threadsData.get(threadID, "data.antiChangeInfoBox", {});
        if (!dataAntiChange.nickname) return;

        const adminBot = global.GoatBot.config.adminBot || [];
        if (adminBot.includes(senderID)) return;

        try {
            // كنجيبو معلومات لڭروب باش نشوفو الكنية الحقيقية دابا
            const threadInfo = await api.getThreadInfo(threadID);
            const currentNickname = threadInfo.nicknames[senderID] || "";
            const savedNickname = dataAntiChange.nickname[senderID] || "";

            // إيلا الكنية متبدلة على اللي فالداتابيز، رجعها ساكت
            if (currentNickname !== savedNickname) {
                api.changeNickname(savedNickname, threadID, senderID);
            }
        } catch (e) {
            // فشل صامت
        }
    },

	onEvent: async function ({ event, threadsData, api }) {
		const { threadID, logMessageType, logMessageData, author } = event;
		const botID = api.getCurrentUserID();

		if (author === botID) return;

		const dataAntiChange = await threadsData.get(threadID, "data.antiChangeInfoBox", {});
		const adminBot = global.GoatBot.config.adminBot || [];
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
				if (!global.antiNameLock) global.antiNameLock = {};
				const now = Date.now();
				const lastAction = global.antiNameLock[threadID] || 0;
				if (now - lastAction < 1500) return;

				const newName = logMessageData.name;
				const oldName = dataAntiChange.name;
				if (newName === oldName) return;

				if (!isBotAdmin) {
					global.antiNameLock[threadID] = now;
					api.setTitle(oldName, threadID); // حيدنا الريكاكشن باش يبقى ساكت
				} else {
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
					api.changeNickname(oldNick, threadID, participant_id); // حيدنا أي ميساج ولا ريكاكشن
				} else {
					await threadsData.set(threadID, nickname, `data.antiChangeInfoBox.nickname.${participant_id}`);
				}
				break;
			}
		}
	}
};
