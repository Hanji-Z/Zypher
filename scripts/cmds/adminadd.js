const fs = require("fs-extra");

module.exports = {
    config: {
        name: "admins",
        aliases: ["a"],
        version: "1.2",
        author: "ShAn & Hanji",
        countDown: 5,
        role: 2,
        category: "SYSTEM",
        guide: {
            en: "   {pn} add <uid | @tag | reply>\n   {pn} remove <uid | @tag | reply>"
        }
    },

    langs: {
        en: {
            added: "✅ | Added admin role for %1 users:\n%2",
            alreadyAdmin: "\n⚠️ | %1 users already have admin role:\n%2",
            missingIdAdd: "⚠️ | Please provide an ID, tag, or reply.",
            removed: "✅ | Removed admin role from %1 users:\n%2",
            notAdmin: "⚠️ | %1 users do not have admin role:\n%2",
            missingIdRemove: "⚠️ | Please provide an ID, tag, or reply."
        }
    },

    onStart: async function ({ message, args, usersData, event, getLang }) {
        const configPath = global.client.dirConfig;
        const currentConfig = global.GoatBot.config; // التعامل المباشر مع الأصل

        switch (args[0]?.toLowerCase()) {
            case "add":
            case "-a": {
                let uids = [];
                if (Object.keys(event.mentions).length > 0) uids = Object.keys(event.mentions);
                else if (event.messageReply) uids.push(event.messageReply.senderID);
                else uids = args.filter(arg => !isNaN(arg) && arg.length > 5);

                if (uids.length === 0) return message.reply(getLang("missingIdAdd"));

                const newAdmins = [];
                const alreadyAdmins = [];

                for (const uid of uids) {
                    if (currentConfig.adminBot.includes(uid)) alreadyAdmins.push(uid);
                    else newAdmins.push(uid);
                }

                if (newAdmins.length > 0) {
                    currentConfig.adminBot.push(...newAdmins);
                    // حفظ التغييرات في الملف الأصلي
                    fs.writeFileSync(configPath, JSON.stringify(currentConfig, null, 2));
                }

                const newAdminNames = await Promise.all(newAdmins.map(uid => usersData.getName(uid)));
                const alreadyAdminNames = await Promise.all(alreadyAdmins.map(uid => usersData.getName(uid)));

                return message.reply(
                    (newAdmins.length > 0 ? getLang("added", newAdmins.length, newAdminNames.map(name => `• ${name}`).join("\n")) : "") +
                    (alreadyAdmins.length > 0 ? getLang("alreadyAdmin", alreadyAdmins.length, alreadyAdminNames.map(name => `• ${name}`).join("\n")) : "")
                );
            }

            case "remove":
            case "-r": {
                let uids = [];
                if (Object.keys(event.mentions).length > 0) uids = Object.keys(event.mentions);
                else if (event.messageReply) uids.push(event.messageReply.senderID);
                else uids = args.filter(arg => !isNaN(arg) && arg.length > 5);

                if (uids.length === 0) return message.reply(getLang("missingIdRemove"));

                const removedAdmins = [];
                const notAdmins = [];

                for (const uid of uids) {
                    if (currentConfig.adminBot.includes(uid)) {
                        removedAdmins.push(uid);
                        const index = currentConfig.adminBot.indexOf(uid);
                        currentConfig.adminBot.splice(index, 1);
                    } else {
                        notAdmins.push(uid);
                    }
                }

                if (removedAdmins.length > 0) {
                    fs.writeFileSync(configPath, JSON.stringify(currentConfig, null, 2));
                }

                const removedNames = await Promise.all(removedAdmins.map(uid => usersData.getName(uid)));
                const notAdminNames = await Promise.all(notAdmins.map(uid => usersData.getName(uid)));

                return message.reply(
                    (removedAdmins.length > 0 ? getLang("removed", removedAdmins.length, removedNames.map(name => `• ${name}`).join("\n")) : "") +
                    (notAdmins.length > 0 ? getLang("notAdmin", notAdmins.length, notAdminNames.map(name => `• ${name}`).join("\n")) : "")
                );
            }

            default:
                return message.reply("⚠️ | Use: add | remove");
        }
    }
};
