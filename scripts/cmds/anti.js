const { getStreamFromURL, uploadImgbb } = global.utils;

module.exports = {
	config: {
		name: "anti", 
		aliases: ["ac", "antichange"],
		version: "2.5",
		author: "𝗦𝗵𝗔𝗻 & Gem9ini",
		countDown: 5,
		role: 2, // للمشرفين فقط
		description: {
			en: "حماية معلومات المجموعة (الاسم، الكنيات، الصورة) مع ميزة العمل الصامت"
		},
		category: "𝗕𝗢𝗫 𝗖𝗛𝗔𝗧",
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
			if (status === "off") {
				delete dataAntiChangeInfoBox[key];
			} else {
				dataAntiChangeInfoBox[key] = data;
			}

			await threadsData.set(threadID, dataAntiChangeInfoBox, "data.antiChangeInfoBox");
			// تفاعل بسيط للتأكيد على التفعيل/الإيقاف
			api.setMessageReaction(status === "on" ? "✅" : "❌", messageID, () => {}, true);
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
				// جلب اسم المجموعة الحالي من بيانات الخيط
				const threadInfo = await api.getThreadInfo(threadID);
				const currentName = threadInfo.threadName;
				await checkAndSaveData("name", currentName);
				break;
			}
			case "nickname": {
				// حفظ جميع كنيات الأعضاء الحالية في كائن واحد
				const threadInfo = await api.getThreadInfo(threadID);
				const originalNicknames = threadInfo.nicknames || {};
				await checkAndSaveData("nickname", originalNicknames);
				break;
			}
			default: return;
		}
	},

	onEvent: async function ({ event, threadsData, api }) {
		const { threadID, logMessageType, logMessageData, author } = event;
		const botID = api.getCurrentUserID();

		// تجاهل التغييرات التي يقوم بها البوت نفسه
		if (author === botID) return;

		const dataAntiChange = await threadsData.get(threadID, "data.antiChangeInfoBox", {});

		switch (logMessageType) {
			case "log:thread-image": {
				if (!dataAntiChange.avatar) return;
				// إعادة الصورة القديمة فوراً
				return api.changeGroupImage(await getStreamFromURL(dataAntiChange.avatar), threadID);
			}

			case "log:thread-name": {
				if (!dataAntiChange.hasOwnProperty("name")) return;
				// إعادة الاسم القديم المخزن في الذاكرة فوراً وبصمت
				return api.setTitle(dataAntiChange.name, threadID);
			}

			case "log:user-nickname": {
				if (!dataAntiChange.hasOwnProperty("nickname")) return;
				const { participant_id } = logMessageData;
				
				// جلب الكنية القديمة من الذاكرة (إذا لم تكن موجودة تصبح فارغة لإزالة الكنية الجديدة)
				const oldNick = dataAntiChange.nickname[participant_id] || "";
				
				// إعادة الكنية القديمة بصمت تام (بدون إرسال أي رسالة في الشات)
				return api.changeNickname(oldNick, threadID, participant_id);
			}
		}
	}
};
const { getStreamFromURL, uploadImgbb } = global.utils;

module.exports = {
	config: {
		name: "anti", 
		aliases: ["ac", "antichange"],
		version: "2.5",
		author: "𝗦𝗵𝗔𝗻 & Gemini",
		countDown: 5,
		role: 2, // للمشرفين فقط
		description: {
			en: "حماية معلومات المجموعة (الاسم، الكنيات، الصورة) مع ميزة العمل الصامت"
		},
		category: "𝗕𝗢𝗫 𝗖𝗛𝗔𝗧",
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
			if (status === "off") {
				delete dataAntiChangeInfoBox[key];
			} else {
				dataAntiChangeInfoBox[key] = data;
			}

			await threadsData.set(threadID, dataAntiChangeInfoBox, "data.antiChangeInfoBox");
			// تفاعل بسيط للتأكيد على التفعيل/الإيقاف
			api.setMessageReaction(status === "on" ? "✅" : "❌", messageID, () => {}, true);
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
				// جلب اسم المجموعة الحالي من بيانات الخيط
				const threadInfo = await api.getThreadInfo(threadID);
				const currentName = threadInfo.threadName;
				await checkAndSaveData("name", currentName);
				break;
			}
			case "nickname": {
				// حفظ جميع كنيات الأعضاء الحالية في كائن واحد
				const threadInfo = await api.getThreadInfo(threadID);
				const originalNicknames = threadInfo.nicknames || {};
				await checkAndSaveData("nickname", originalNicknames);
				break;
			}
			default: return;
		}
	},

	onEvent: async function ({ event, threadsData, api }) {
		const { threadID, logMessageType, logMessageData, author } = event;
		const botID = api.getCurrentUserID();

		// تجاهل التغييرات التي يقوم بها البوت نفسه
		if (author === botID) return;

		const dataAntiChange = await threadsData.get(threadID, "data.antiChangeInfoBox", {});

		switch (logMessageType) {
			case "log:thread-image": {
				if (!dataAntiChange.avatar) return;
				// إعادة الصورة القديمة فوراً
				return api.changeGroupImage(await getStreamFromURL(dataAntiChange.avatar), threadID);
			}

			case "log:thread-name": {
				if (!dataAntiChange.hasOwnProperty("name")) return;
				// إعادة الاسم القديم المخزن في الذاكرة فوراً وبصمت
				return api.setTitle(dataAntiChange.name, threadID);
			}

			case "log:user-nickname": {
				if (!dataAntiChange.hasOwnProperty("nickname")) return;
				const { participant_id } = logMessageData;
				
				// جلب الكنية القديمة من الذاكرة (إذا لم تكن موجودة تصبح فارغة لإزالة الكنية الجديدة)
				const oldNick = dataAntiChange.nickname[participant_id] || "";
				
				// إعادة الكنية القديمة بصمت تام (بدون إرسال أي رسالة في الشات)
				return api.changeNickname(oldNick, threadID, participant_id);
			}
		}
	}
};
