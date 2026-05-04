module.exports = {
	config: {
		name: "protectOwner",
		version: "1.0.0",
		author: "xossama2001",
		category: "events"
	},

	onStart: async ({ event, api, message }) => {
		const config = global.GoatBot.config;
		const ownerList = config.owner || [];

		// إذا ما في أونرز في الـ config، طلع
		if (!ownerList || ownerList.length === 0) return;

		const { threadID, logMessageType, logMessageData } = event;
		const actor = event.author;

		// 🚫 إذا المعتدي أونر، ما نشتغل (الأونرز ما يطردوا بعض بلاش)
		if (ownerList.includes(actor)) return;

		// 🚫 حالة 1: شخص طرد الأونر من المجموعة
		if (logMessageType === "log:unsubscribe") {
			const removedUsers = logMessageData.removedParticipants || [];

			for (const user of removedUsers) {
				const removedUserID = user.userFbId;

				// التحقق اذا المحذوف هو أونر
				if (ownerList.includes(removedUserID)) {
					// طرد المعتدي صمت (بدون رسالة)
					try {
						await api.removeUserFromGroup(actor, threadID);
					} catch (e) { }

					// رجع الأونر صمت (بدون رسالة)
					try {
						await api.addUserToGroup(removedUserID, threadID);
					} catch (e) { }

					// أعطيه صلاحيات مسؤول صمت (بدون رسالة)
					try {
						await api.changeAdminStatus(threadID, removedUserID, true);
					} catch (e) { }
				}
			}
		}

		// 🚫 حالة 2: شخص حذف صلاحية الأونر كمسؤول
		if (logMessageType === "log:thread-admins") {
			const adminsData = logMessageData.TARGET_ID;

			if (ownerList.includes(adminsData)) {
				// شوف إذا تم حذف صلاحية الأونر
				const currentAdmins = (await api.getThreadInfo(threadID)).adminIDs || [];
				const isAdminNow = currentAdmins.some(admin => 
					(admin.id || admin) == adminsData || (typeof admin === 'string' && admin == adminsData)
				);

				// إذا الأونر ما عاد مسؤول، أعطيه الصلاحية مرة تانية صمت
				if (!isAdminNow) {
					try {
						await api.changeAdminStatus(threadID, adminsData, true);
					} catch (e) { }

					// طرد المعتدي صمت (بدون رسالة)
					try {
						await api.removeUserFromGroup(actor, threadID);
					} catch (e) { }
				}
			}
		}
	}
};
