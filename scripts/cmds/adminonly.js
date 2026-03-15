const fs = require("fs-extra");
const { config } = global.GoatBot;
const { client } = global;

module.exports = {
	config: {
		name: "adminonly",
		aliases: ["adonly", "onlyad", "onlyadmin"],
		version: "1.7",
		author: "NTKhang & ShAn",
		countDown: 2,
		role: 2,
		description: {
			en: "وضع المسؤولين فقط - تفاعل صامت بالجمجمة"
		},
		category: "𝗕𝗢𝗧 𝗠𝗔𝗡𝗔𝗚𝗘𝗠𝗘𝗡𝗧",
		guide: {
			en: "{pn} [on | off] أو {pn} noti [on | off]"
		}
	},

	onLoad: function() {
		let isChanged = false;
		if (config.adminOnly.enable !== true) {
			config.adminOnly.enable = true;
			isChanged = true;
		}
		if (config.hideNotiMessage.adminOnly !== true) {
			config.hideNotiMessage.adminOnly = true;
			isChanged = true;
		}
		if (isChanged) {
			fs.writeFileSync(client.dirConfig, JSON.stringify(config, null, 2));
		}
	},

	onStart: async function ({ args, message, event, api }) {
		let isSetNoti = false;
		let value;
		let indexGetVal = 0;

		if (args[0] == "noti") {
			isSetNoti = true;
			indexGetVal = 1;
		}

		if (args[indexGetVal] == "on")
			value = true;
		else if (args[indexGetVal] == "off")
			value = false;
		else return; // تجاهل أي نص خاطئ بدون رد

		if (isSetNoti) {
			config.hideNotiMessage.adminOnly = !value;
		}
		else {
			config.adminOnly.enable = value;
		}

		// حفظ الإعدادات
		fs.writeFileSync(client.dirConfig, JSON.stringify(config, null, 2));

		// التفاعل بجمجمة بدل الرسالة النصية
		return api.setMessageReaction("💈", event.messageID, (err) => {}, true);
	}
};
