const fs = require("fs-extra");
const nullAndUndefined = [undefined, null];

function getType(obj) {
        return Object.prototype.toString.call(obj).slice(8, -1);
}

function getRole(threadData, senderID) {
        const adminBot = global.GoatBot.config.adminBot || [];
        if (!senderID) return 0;
        if (adminBot.includes(senderID)) return 2; 

        const adminBox = threadData ? threadData.adminIDs || [] : [];
        const isGroupAdmin = adminBox.some(admin => (admin.id || admin) == senderID);
        
        return isGroupAdmin ? 1 : 0; 
}

function getText(type, reason, time, targetID, lang) {
        const utils = global.utils;
        if (type == "userBanned") return utils.getText({ lang, head: "handlerEvents" }, "userBanned", reason, time, targetID);
        else if (type == "threadBanned") return utils.getText({ lang, head: "handlerEvents" }, "threadBanned", reason, time, targetID);
        else if (type == "onlyAdminBox") return utils.getText({ lang, head: "handlerEvents" }, "onlyAdminBox");
        else if (type == "onlyAdminBot") return utils.getText({ lang, head: "handlerEvents" }, "onlyAdminBot");
}

function replaceShortcutInLang(text, prefix, commandName) {
        return text.replace(/\{(?:p|prefix)\}/g, prefix).replace(/\{(?:n|name)\}/g, commandName).replace(/\{pn\}/g, `${prefix}${commandName}`);
}

function getRoleConfig(utils, command, isGroup, threadData, commandName) {
        let roleConfig;
        if (utils.isNumber(command.config.role)) roleConfig = { onStart: command.config.role };
        else if (typeof command.config.role == "object" && !Array.isArray(command.config.role)) {
                if (!command.config.role.onStart) command.config.role.onStart = 0;
                roleConfig = command.config.role;
        } else roleConfig = { onStart: 0 };

        if (isGroup) roleConfig.onStart = threadData.data.setRole?.[commandName] ?? roleConfig.onStart;
        for (const key of ["onChat", "onStart", "onReaction", "onReply"]) {
                if (roleConfig[key] == undefined) roleConfig[key] = roleConfig.onStart;
        }
        return roleConfig;
}

// 🛡️ --- [ دالة التفتيش: صمت المحظورين + استثناء الكيك للأدمن ] ---
function isBannedOrOnlyAdmin(userData, threadData, role, threadID, isGroup, commandName, message, lang) {
        const config = global.GoatBot.config;
        const { hideNotiMessage, adminBot } = config;

        // 1. Shadow Ban (صمت تام للمحظورين)
        if (userData.banned && userData.banned.status === true) return true;

        // 2. Admin Only (Global Bot Lock)
        if (config.adminOnly && config.adminOnly.enable === true && role < 2 && !config.adminOnly.ignoreCommand.includes(commandName)) {
                if (hideNotiMessage.adminOnly === false) message.reply(getText("onlyAdminBot", null, null, null, lang));
                return true;
        }

        // 3. Only Admin Box (Group Lock)
        if (isGroup === true && threadData.data && threadData.data.onlyAdminBox === true) {
                const isBotAdmin = role === 2;
                const isGroupAdmin = role === 1;
                // 🔓 هـنـا الـبـايـبـاس: المطور كيدوز، والأدمن كيدوز غير فـ الكيك
                const canPass = isBotAdmin || (isGroupAdmin && commandName === "kick");
                
                if (!canPass) {
                        if (!threadData.data.hideNotiMessageOnlyAdminBox) message.reply(getText("onlyAdminBox", null, null, null, lang));
                        return true;
                }
        }

        // 4. Thread Banned
        if (isGroup === true && threadData.banned && threadData.banned.status === true) {
                if (hideNotiMessage.threadBanned === false) message.reply(getText("threadBanned", threadData.banned.reason, threadData.banned.date, threadID, lang));
                return true;
        }
        return false;
}

function createGetText2(langCode, pathCustomLang, prefix, command) {
        const commandName = command.config.name;
        return function (key, ...args) {
                let lang = command.langs?.[langCode]?.[key] || "";
                lang = replaceShortcutInLang(lang, prefix, commandName);
                for (let i = args.length - 1; i >= 0; i--) lang = lang.replace(new RegExp(`%${i + 1}`, "g"), args[i]);
                return lang || `❌ Key "${key}" not found`;
        };
}

module.exports = function (api, threadModel, userModel, dashBoardModel, globalModel, usersData, threadsData, dashBoardData, globalData) {
        return async function (event, message) {
                const { utils, client, GoatBot } = global;
                const { getPrefix, log, getTime, removeHomeDir } = utils;
                const { config, configCommands: { envGlobal, envCommands, envEvents } } = GoatBot;

                const { body, messageID, threadID, isGroup } = event;
                if (!threadID) return;

                const senderID = event.userID || event.senderID || event.author;
                const cachedThreadData = global.db.allThreadData.find(t => t.threadID == threadID);
                const cachedUserData = global.db.allUserData.find(u => u.userID == senderID);
                const [threadData, userData] = await Promise.all([
                        cachedThreadData || threadsData.create(threadID),
                        cachedUserData || usersData.create(senderID)
                ]);

                const prefix = getPrefix(threadID);
                const role = getRole(threadData, senderID);
                const langCode = threadData.data.lang || config.language || "en";

                const parameters = { api, usersData, threadsData, message, event, userModel, threadModel, prefix, role, langCode, envCommands, envEvents, envGlobal };

                // ———————————————— [ ON START ] ————————————————
                async function onStart() {
                        if (!body || !body.startsWith(prefix)) return;
                        const dateNow = Date.now();
                        const args = body.slice(prefix.length).trim().split(/ +/);
                        let commandName = args.shift().toLowerCase();
                        let command = GoatBot.commands.get(commandName) || GoatBot.commands.get(GoatBot.aliases.get(commandName));
                        if (command) commandName = command.config.name;

                        if (isBannedOrOnlyAdmin(userData, threadData, role, threadID, isGroup, commandName, message, langCode)) return;
                        if (!command) return;

                        const roleConfig = getRoleConfig(utils, command, isGroup, threadData, commandName);
                        if (roleConfig.onStart > role) return;

                        if (!client.countDown[commandName]) client.countDown[commandName] = {};
                        const timestamps = client.countDown[commandName];
                        const cooldownCommand = (command.config.countDown || 1) * 1000;

                        if (timestamps[senderID] && dateNow < timestamps[senderID] + cooldownCommand) return;

                        try {
                                const getText2 = createGetText2(langCode, "", prefix, command);
                                await command.onStart({ ...parameters, args, commandName, getLang: getText2 });
                                timestamps[senderID] = dateNow;
                                log.info("CALL COMMAND", `${commandName} | ${senderID} | ${threadID}`);
                        } catch (err) { log.err("onStart", err); }
                }

                // ———————————————— [ ON CHAT ] ————————————————
                async function onChat() {
                        const allOnChat = GoatBot.onChat || [];
                        for (const key of allOnChat) {
                                const command = GoatBot.commands.get(key);
                                if (!command || getRoleConfig(utils, command, isGroup, threadData, command.config.name).onChat > role) continue;
                                if (isBannedOrOnlyAdmin(userData, threadData, role, threadID, isGroup, command.config.name, message, langCode)) return;
                                try { await command.onChat({ ...parameters, args: body ? body.split(/ +/) : [], commandName: command.config.name }); } catch (err) { }
                        }
                }

                // ———————————————— [ ON ANY EVENT ] ————————————————
                async function onAnyEvent() {
                        const allOnAnyEvent = GoatBot.onAnyEvent || [];
                        for (const key of allOnAnyEvent) {
                                const command = GoatBot.commands.get(key);
                                if (command) try { await command.onAnyEvent({ ...parameters, commandName: command.config.name }); } catch (err) { }
                        }
                }

                // ———————————————— [ ON FIRST CHAT ] ————————————————
                async function onFirstChat() {
                        const allOnFirstChat = GoatBot.onFirstChat || [];
                        for (const item of allOnFirstChat) {
                                if (item.threadIDsChattedFirstTime.includes(threadID)) continue;
                                const command = GoatBot.commands.get(item.commandName);
                                if (command) {
                                        item.threadIDsChattedFirstTime.push(threadID);
                                        try { await command.onFirstChat({ ...parameters, commandName: command.config.name }); } catch (err) { }
                                }
                        }
                }

                // ———————————————— [ ON REPLY ] ————————————————
                async function onReply() {
                        if (!event.messageReply) return;
                        const Reply = GoatBot.onReply.get(event.messageReply.messageID);
                        if (!Reply) return;
                        const command = GoatBot.commands.get(Reply.commandName);
                        if (!command || getRoleConfig(utils, command, isGroup, threadData, Reply.commandName).onReply > role) return;
                        if (isBannedOrOnlyAdmin(userData, threadData, role, threadID, isGroup, Reply.commandName, message, langCode)) return;
                        try { await command.onReply({ ...parameters, Reply, args: body ? body.split(/ +/) : [], commandName: Reply.commandName }); } catch (err) { }
                }

                // ———————————————— [ ON REACTION ] ————————————————
                async function onReaction() {
                        const Reaction = GoatBot.onReaction.get(messageID);
                        if (!Reaction) return;
                        const command = GoatBot.commands.get(Reaction.commandName);
                        if (!command || getRoleConfig(utils, command, isGroup, threadData, Reaction.commandName).onReaction > role) return;
                        if (isBannedOrOnlyAdmin(userData, threadData, role, threadID, isGroup, Reaction.commandName, message, langCode)) return;
                        try { await command.onReaction({ ...parameters, Reaction, args: [], commandName: Reaction.commandName }); } catch (err) { }
                }

                // ———————————————— [ ON EVENT ] ————————————————
                async function onEvent() {
                        const allOnEvent = GoatBot.onEvent || [];
                        for (const key of allOnEvent) {
                                const command = GoatBot.commands.get(key);
                                if (command) try { await command.onEvent({ ...parameters, commandName: command.config.name }); } catch (err) { }
                        }
                }

                // ———————————————— [ HANDLER EVENT ] ————————————————
                async function handlerEvent() {
                        const allEventCommand = GoatBot.eventCommands.entries();
                        for (const [key, getEvent] of allEventCommand) {
                                try { await getEvent.onStart({ ...parameters, commandName: getEvent.config.name }); } catch (err) { log.err("EVENT_HANDLER", `Error in event command "${getEvent.config.name}": ${err.message || err}`, err); }
                        }
                }

                // ❌ تـم حـذف الأسطـر الـمسببة لـلـتـكـرار مـن هـنـا لضمان عدم ازدواجية الرد ✅

                return { onAnyEvent, onFirstChat, onChat, onStart, onReaction, onReply, onEvent, handlerEvent, presence: async () => {}, read_receipt: async () => {}, typ: async () => {} };
        };
};

