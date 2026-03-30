const DIG = require("discord-image-generation");
const fs = require("fs-extra");

module.exports = {
	config: {
		name: "affect",
		version: "1.1",
		author: "𝗦𝗵𝗔𝗻",
		countDown: 5,
		role: 0,
		shortDescription: "Affect8 image",
		longDescription: "Affect image",
		category: "𝗜𝗠𝗔𝗚𝗘",
		guide: {
			vi: "{pn} [@tag | để trống]",
			en: "{pn} [@tag]"
		}
	},

	onStart: async function ({ event, message, usersData }) {
		const uid = Object.keys(event.mentions)[0]
    if(!uid) return message.reply("Mention someone")
		const avatarURL = await usersData.getAvatarUrl(uid);
		const img = await new DIG.Affect().getImage(avatarURL);
		const pathSave = `${__dirname}/tmp/${uid}_Trash.png`;
		fs.writeFileSync(pathSave, Buffer.from(img));
		message.reply({
			attachment: fs.createReadStream(pathSave)
		}, () => fs.unlinkSync(pathSave));
	}
};
