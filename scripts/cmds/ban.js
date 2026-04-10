const { findUid } = global.utils;
const moment = require("moment-timezone");

module.exports = {
	config: {
		name: "ban",
		version: "1.6",
		author: "Hanji (Zypher Mod)",
		countDown: 5,
		role: 1,
		description: {
			en: "Ban/Unban users and keep them out forever."
		},
		category: "SYSTEM",
		guide: {
			en: "{pn} [@tag | uid | link | reply] [Reason]\n{pn} unban [@tag | uid]\n{pn} list\n{pn} check"
		}
	},

	langs: {
		en: {
			notFoundTarget: "█║ ⚠️ | Please tag a target, enter a UID, or reply to a message.",
			notFoundTargetUnban: "█║ ⚠️ | Please specify the user to unban (Tag or UID).",
			userNotBanned: "█║ ⚠️ | User with ID %1 is not in the blacklist.",
			unbannedSuccess: "█║ ✅ | %1 has been released from the blacklist.",
			cantSelfBan: "█║ ⚠️ | Self-ban detected. Command aborted.",
			cantBanAdmin: "█║ ❌ | Administrators are immune to system bans.",
			existedBan: "█║ ❌ | This user is already blacklisted.",
			noReason: "No reason provided",
			bannedSuccess: "█║ ✅ | %1 has been blacklisted and removed from the sector. ⛓️",
			needAdmin: "█║ ⚠️ | Bot requires Administrator privileges to enforce the kick.",
			noName: "Facebook User",
			noData: "█║ 📑 | The blacklist database is currently empty.",
			listBanned: "█║ 📑 | Blacklisted Members (Page %1/%2):",
			content: "█║ %1/ %2 (%3)\n❯ Reason: %4\n❯ Time: %5\n\n",
			needAdminToKick: "█║ ⚠️ | User %1 is blacklisted, but I lack Admin permissions to kick them.",
			bannedKick: "█║ ⚠️ | %1 attempted to infiltrate while blacklisted!\n❯ Reason: %3\n❯ Action: Auto-Kicked by Zypher System. 🚪"
		}
	},

	onStart: async function ({ message, event, args, threadsData, getLang, usersData, api }) {
		const { members, adminIDs } = await threadsData.get(event.threadID);
		const { senderID, threadID, messageID } = event;
		let target, reason;

		const dataBanned = await threadsData.get(threadID, 'data.banned_ban', []);

		if (args[0] == 'unban') {
			target = Object.keys(event.mentions || {})[0] || (event.messageReply?.senderID) || (!isNaN(args[1]) ? args[1] : (args[1]?.startsWith('https') ? await findUid(args[1]) : null));
			if (!target) return message.reply(getLang('notFoundTargetUnban'));

			const index = dataBanned.findIndex(item => item.id == target);
			if (index == -1) return message.reply(getLang('userNotBanned', target));

			dataBanned.splice(index, 1);
			await threadsData.set(threadID, dataBanned, 'data.banned_ban');
			const userName = members[target]?.name || await usersData.getName(target) || getLang('noName');
			return message.reply(getLang('unbannedSuccess', userName));
		}
		
		if (args[0] == "check") {
			if (!dataBanned.length) return;
			for (const user of dataBanned) {
				if (event.participantIDs.includes(user.id)) api.removeUserFromGroup(user.id, threadID);
			}
			return api.setMessageReaction("✅", messageID, () => {}, true);
		}

		if (args[0] == 'list') {
			if (!dataBanned.length) return message.reply(getLang('noData'));
			const limit = 15;
			const page = parseInt(args[1] || 1) || 1;
			const start = (page - 1) * limit;
			const data = dataBanned.slice(start, start + limit);
			let msg = '';
			data.forEach((user, index) => {
				msg += getLang('content', start + index + 1, members[user.id]?.name || "User", user.id, user.reason, user.time);
			});
			return message.reply(getLang('listBanned', page, Math.ceil(dataBanned.length / limit)) + '\n\n' + msg);
		}

		// Logic for Banning
		target = Object.keys(event.mentions || {})[0] || (event.messageReply?.senderID) || (!isNaN(args[0]) ? args[0] : (args[0]?.startsWith('https') ? await findUid(args[0]) : null));
		reason = args.join(' ').replace(target, '').trim();

		if (!target) return message.reply(getLang('notFoundTarget'));
		if (target == senderID) return message.reply(getLang('cantSelfBan'));
		if (adminIDs.includes(target)) return message.reply(getLang('cantBanAdmin'));
		if (dataBanned.some(item => item.id == target)) return message.reply(getLang('existedBan'));

		const name = members[target]?.name || (await usersData.getName(target)) || getLang('noName');
		const time = moment().tz(global.GoatBot.config.timeZone).format('HH:mm:ss DD/MM/YYYY');
		
		dataBanned.push({ id: target, time, reason: reason || getLang('noReason') });
		await threadsData.set(threadID, dataBanned, 'data.banned_ban');

		message.reply(getLang('bannedSuccess', name), () => {
			if (event.participantIDs.includes(target)) {
				if (adminIDs.includes(api.getCurrentUserID())) {
					api.removeUserFromGroup(target, threadID);
				} else {
					message.send(getLang('needAdmin'));
				}
			}
		});
	},

	onEvent: async function ({ event, api, threadsData, getLang, message }) {
		if (event.logMessageType == "log:subscribe") {
			const { threadID } = event;
			const dataBanned = await threadsData.get(threadID, 'data.banned_ban', []);
			const usersAdded = event.logMessageData.addedParticipants;

			for (const user of usersAdded) {
				const { userFbId, fullName } = user;
				const banned = dataBanned.find(item => item.id == userFbId);
				if (banned) {
					api.removeUserFromGroup(userFbId, threadID, err => {
						if (err) message.send(getLang('needAdminToKick', fullName, userFbId));
						else message.send(getLang('bannedKick', fullName, userFbId, banned.reason, banned.time));
					});
				}
			}
		}
	}
};
