const fs = require("fs-extra");
const nullAndUndefined = [undefined, null];

function getType(obj) {
	return Object.prototype.toString.call(obj).slice(8, -1);
}

function getRole(threadData, senderID) {
	const adminBot = global.GoatBot.config.adminBot || [];
	if (!senderID)
		return 0;
	const adminBox = threadData ? threadData.adminIDs || [] : [];
	return adminBot.includes(senderID) ? 2 : adminBox.includes(senderID) ? 1 : 0;
}

function getText(type, reason, time, targetID, lang) {
	const utils = global.utils;
	if (type == "userBanned")
		return utils.getText({ lang, head: "handlerEvents" }, "userBanned", reason, time, targetID);
	else if (type == "threadBanned")
		return utils.getText({ lang, head: "handlerEvents" }, "threadBanned", reason, time, targetID);
	else if (type == "onlyAdminBox")
		return utils.getText({ lang, head: "handlerEvents" }, "onlyAdminBox");
	else if (type == "onlyAdminBot")
		return utils.getText({ lang, head: "handlerEvents" }, "onlyAdminBot");
}

function replaceShortcutInLang(text, prefix, commandName) {
	return text
		.replace(/\{(?:p|prefix)\}/g, prefix)
		.replace(/\{(?:n|name)\}/g, commandName)
		.replace(/\{pn\}/g, `${prefix}${commandName}`);
}

function getRoleConfig(utils, command, isGroup, threadData, commandName) {
	let roleConfig;
	if (utils.isNumber(command.config.role)) {
		roleConfig = {
			onStart: command.config.role
		};
	}
	else if (typeof command.config.role == "object" && !Array.isArray(command.config.role)) {
		if (!command.config.role.onStart)
			command.config.role.onStart = 0;
		roleConfig = command.config.role;
	}
	else {
		roleConfig = {
			onStart: 0
		};
	}

	if (isGroup)
		roleConfig.onStart = threadData.data.setRole?.[commandName] ?? roleConfig.onStart;

	for (const key of ["onChat", "onStart", "onReaction", "onReply"]) {
		if (roleConfig[key] == undefined)
			roleConfig[key] = roleConfig.onStart;
	}

	return roleConfig;
}

// 🛡️ --- [ دالة التفتيش: صمت المحظورين + حصانة المطور + استثناء الكيك ] ---
function isBannedOrOnlyAdmin(userData, threadData, senderID, threadID, isGroup, commandName, message, lang) {
	const config = global.GoatBot.config;
	const { adminBot, hideNotiMessage } = config;

	// 1. Shadow Ban (الصمت التام للمحظورين)
	const infoBannedUser = userData.banned;
	if (infoBannedUser.status == true) {
		return true; 
	}

	// 2. Admin Only (Global Bot Admin Lock)
	if (
		config.adminOnly.enable == true
		&& !adminBot.includes(senderID)
		&& !config.adminOnly.ignoreCommand.includes(commandName)
	) {
		if (hideNotiMessage.adminOnly == false)
			message.reply(getText("onlyAdminBot", null, null, null, lang));
		return true;
	}

	// 3. Only Admin Box (Group Lock)
	if (isGroup == true) {
		const isGroupAdmin = threadData.adminIDs.includes(senderID);
		const isBotAdmin = adminBot.includes(senderID);

		if (threadData.data.onlyAdminBox === true) {
			// 🔓 هـنـا الـتـعديـل: إيلا ماكنتيش مطور وماكنتيش (أدمن لڭروب باغي يستعمل كيك)، غاتتحبس
			if (!isBotAdmin && (!isGroupAdmin || commandName !== "kick")) {
				if (!threadData.data.hideNotiMessageOnlyAdminBox)
					message.reply(getText("onlyAdminBox", null, null, null, lang));
				return true;
			}
		}

		// 4. Thread Banned
		const infoBannedThread = threadData.banned;
		if (infoBannedThread.status == true) {
			const { reason, date } = infoBannedThread;
			if (hideNotiMessage.threadBanned == false)
				message.reply(getText("threadBanned", reason, date, threadID, lang));
			return true;
		}
	}
	return false;
}

function createGetText2(langCode, pathCustomLang, prefix, command) {
	const commandType = command.config.countDown ? "command" : "command event";
	const commandName = command.config.name;
	let customLang = {};
	let getText2 = () => { };
	if (fs.existsSync(pathCustomLang))
		customLang = require(pathCustomLang)[commandName]?.text || {};
	if (command.langs || customLang || {}) {
		getText2 = function (key, ...args) {
			let lang = command.langs?.[langCode]?.[key] || customLang[key] || "";
			lang = replaceShortcutInLang(lang, prefix, commandName);
			for (let i = args.length - 1; i >= 0; i--)
				lang = lang.replace(new RegExp(`%${i + 1}`, "g"), args[i]);
			return lang || `❌ Can't find text on language "${langCode}" for ${commandType} "${commandName}" with key "${key}"`;
		};
	}
	return getText2;
}

module.exports = function (api, threadModel, userModel, dashBoardModel, globalModel, usersData, threadsData, dashBoardData, globalData) {
	return async function (event, message) {

		const { utils, client, GoatBot } = global;
		const { getPrefix, removeHomeDir, log, getTime } = utils;
		const { config, configCommands: { envGlobal, envCommands, envEvents } } = GoatBot;
		const { autoRefreshThreadInfoFirstTime } = config.database;
		let { hideNotiMessage = {} } = config;

		const { body, messageID, threadID, isGroup } = event;

		if (!threadID) return;

		const senderID = event.userID || event.senderID || event.author;

		let threadData = global.db.allThreadData.find(t => t.threadID == threadID);
		let userData = global.db.allUserData.find(u => u.userID == senderID);

		if (!userData && !isNaN(senderID)) userData = await usersData.create(senderID);

		if (!threadData && !isNaN(threadID)) {
			if (global.temp.createThreadDataError.includes(threadID)) return;
			threadData = await threadsData.create(threadID);
			global.db.receivedTheFirstMessage[threadID] = true;
		} else {
			if (autoRefreshThreadInfoFirstTime === true && !global.db.receivedTheFirstMessage[threadID]) {
				global.db.receivedTheFirstMessage[threadID] = true;
				await threadsData.refreshInfo(threadID);
			}
		}

		if (typeof threadData.settings.hideNotiMessage == "object")
			hideNotiMessage = threadData.settings.hideNotiMessage;

		const prefix = getPrefix(threadID);
		const role = getRole(threadData, senderID);
		const parameters = {
			api, usersData, threadsData, message, event,
			userModel, threadModel, prefix, dashBoardModel,
			globalModel, dashBoardData, globalData, envCommands,
			envEvents, envGlobal, role,
			removeCommandNameFromBody: function (body_, prefix_, commandName_) {
				return body_.replace(new RegExp(`^${prefix_}(\\s+|)${commandName_}`, "i"), "").trim();
			}
		};
		const langCode = threadData.data.lang || config.language || "en";

		function createMessageSyntaxError(commandName) {
			message.SyntaxError = async function () {
				return await message.reply(utils.getText({ lang: langCode, head: "handlerEvents" }, "commandSyntaxError", prefix, commandName));
			};
		}

		let isUserCallCommand = false;

		async function onStart() {
			if (!body || !body.startsWith(prefix)) return;
			const dateNow = Date.now();
			const args = body.slice(prefix.length).trim().split(/ +/);
			let commandName = args.shift().toLowerCase();
			let command = GoatBot.commands.get(commandName) || GoatBot.commands.get(GoatBot.aliases.get(commandName));
			
			const aliasesData = threadData.data.aliases || {};
			for (const cmdName in aliasesData) {
				if (aliasesData[cmdName].includes(commandName)) {
					command = GoatBot.commands.get(cmdName);
					break;
				}
			}
			if (command) commandName = command.config.name;

			if (isBannedOrOnlyAdmin(userData, threadData, senderID, threadID, isGroup, commandName, message, langCode))
				return;

			if (!command) {
				if (!hideNotiMessage.commandNotFound)
					return await message.reply(commandName ? utils.getText({ lang: langCode, head: "handlerEvents" }, "commandNotFound", commandName, prefix) : utils.getText({ lang: langCode, head: "handlerEvents" }, "commandNotFound2", prefix));
				return;
			}

			const roleConfig = getRoleConfig(utils, command, isGroup, threadData, commandName);
			if (roleConfig.onStart > role) {
				if (!hideNotiMessage.needRoleToUseCmd) {
					if (roleConfig.onStart == 1) return await message.reply(utils.getText({ lang: langCode, head: "handlerEvents" }, "onlyAdmin", commandName));
					if (roleConfig.onStart == 2) return await message.reply(utils.getText({ lang: langCode, head: "handlerEvents" }, "onlyAdminBot2", commandName));
				}
				return;
			}

			if (!client.countDown[commandName]) client.countDown[commandName] = {};
			const timestamps = client.countDown[commandName];
			let getCoolDown = command.config.countDown || 1;
			const cooldownCommand = getCoolDown * 1000;

			if (timestamps[senderID]) {
				const expirationTime = timestamps[senderID] + cooldownCommand;
				if (dateNow < expirationTime) return await message.reply(utils.getText({ lang: langCode, head: "handlerEvents" }, "waitingForCommand", ((expirationTime - dateNow) / 1000).toString().slice(0, 3)));
			}

			isUserCallCommand = true;
			try {
				createMessageSyntaxError(commandName);
				const getText2 = createGetText2(langCode, `${process.cwd()}/languages/cmds/${langCode}.js`, prefix, command);
				await command.onStart({...parameters, args, commandName, getLang: getText2});
				timestamps[senderID] = dateNow;
				log.info("CALL COMMAND", `${commandName} | ${userData.name} | ${senderID} | ${threadID}`);
			} catch (err) { log.err("onStart", err); }
		}

		async function onChat() {
			const allOnChat = GoatBot.onChat || [];
			for (const key of allOnChat) {
				const command = GoatBot.commands.get(key);
				if (!command) continue;
				const roleConfig = getRoleConfig(utils, command, isGroup, threadData, command.config.name);
				if (roleConfig.onChat > role) continue;
				if (isBannedOrOnlyAdmin(userData, threadData, senderID, threadID, isGroup, command.config.name, message, langCode)) return;
				try { await command.onChat({...parameters, isUserCallCommand, args: body ? body.split(/ +/) : [], commandName: command.config.name}); } catch (err) { log.err("onChat", err); }
			}
		}

		async function onAnyEvent() {
			const allOnAnyEvent = GoatBot.onAnyEvent || [];
			for (const key of allOnAnyEvent) {
				const command = GoatBot.commands.get(key);
				if (!command) continue;
				try { await command.onAnyEvent({...parameters, args: body ? body.split(/ +/) : [], commandName: command.config.name}); } catch (err) { log.err("onAnyEvent", err); }
			}
		}

		async function onFirstChat() {
			const allOnFirstChat = GoatBot.onFirstChat || [];
			for (const item of allOnFirstChat) {
				if (item.threadIDsChattedFirstTime.includes(threadID)) continue;
				const command = GoatBot.commands.get(item.commandName);
				if (!command) continue;
				item.threadIDsChattedFirstTime.push(threadID);
				try { await command.onFirstChat({...parameters, isUserCallCommand, args: body ? body.split(/ +/) : [], commandName: command.config.name}); } catch (err) { log.err("onFirstChat", err); }
			}
		}

		async function onReply() {
			if (!event.messageReply) return;
			const Reply = GoatBot.onReply.get(event.messageReply.messageID);
			if (!Reply) return;
			const command = GoatBot.commands.get(Reply.commandName);
			if (!command) return;
			const roleConfig = getRoleConfig(utils, command, isGroup, threadData, Reply.commandName);
			if (roleConfig.onReply > role) return;
			if (isBannedOrOnlyAdmin(userData, threadData, senderID, threadID, isGroup, Reply.commandName, message, langCode)) return;
			try { await command.onReply({...parameters, Reply, args: body ? body.split(/ +/) : [], commandName: Reply.commandName}); } catch (err) { log.err("onReply", err); }
		}

		async function onReaction() {
			const Reaction = GoatBot.onReaction.get(messageID);
			if (!Reaction) return;
			const command = GoatBot.commands.get(Reaction.commandName);
			if (!command) return;
			const roleConfig = getRoleConfig(utils, command, isGroup, threadData, Reaction.commandName);
			if (roleConfig.onReaction > role) return;
			if (isBannedOrOnlyAdmin(userData, threadData, senderID, threadID, isGroup, Reaction.commandName, message, langCode)) return;
			try { await command.onReaction({...parameters, Reaction, args: [], commandName: Reaction.commandName}); } catch (err) { log.err("onReaction", err); }
		}

		async function handlerEvent() {
			const allEventCommand = GoatBot.eventCommands.entries();
			for (const [key, getEvent] of allEventCommand) {
				try { await getEvent.onStart({...parameters, commandName: getEvent.config.name}); } catch (err) { log.err("EVENT COMMAND", err); }
			}
		}

		async function onEvent() {
			const allOnEvent = GoatBot.onEvent || [];
			for (const key of allOnEvent) {
				const command = GoatBot.commands.get(key);
				if (!command) continue;
				try { await command.onEvent({...parameters, args: [], commandName: command.config.name}); } catch (err) { log.err("onEvent", err); }
			}
		}

		// تنفيذ المهام
		onStart(); onChat(); onAnyEvent(); onFirstChat(); onReply(); onReaction(); handlerEvent(); onEvent();

		return { onAnyEvent, onFirstChat, onChat, onStart, onReaction, onReply, onEvent, handlerEvent, presence: async () => {}, read_receipt: async () => {}, typ: async () => {} };
	};
};

