module.exports.config = {
	name: "say",
	version: "2.0.0",
	role: 0,
	author: "Gemini & ShAn",
	description: "تحويل النص إلى صوت احترافي باللغة العربية",
	category: "media",
	guide: {
        en: "{pn} [النص] أو الرد على رسالة"
    },
	countDowns: 5,
	dependencies: {
		"path": "",
		"fs-extra": ""
	}
};

module.exports.onStart = async function({ api, event, args }) {
	try {
		const { createReadStream, unlinkSync } = require('fs-extra');
		const { resolve } = require('path');

		// جلب النص سواء كان رداً على رسالة أو مكتوباً بعد الأمر
		let content = (event.type == "message_reply") ? event.messageReply.body : args.join(" ");
		
        if (!content) return api.sendMessage("يرجى كتابة نص أو الرد على رسالة لتحويلها لصوت! ⚠️", event.threadID, event.messageID);

		const path = resolve(__dirname, 'cache', `${event.threadID}_${event.senderID}.mp3`);

		// التعديل الأساسي: tl=ar لجعل الصوت عربياً
		// يمكنك تغيير المحرك ليعطي نبرة مختلفة قليلاً عبر التلاعب برابط جوجل
		const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(content)}&tl=ar&client=tw-ob`;

		await global.utils.downloadFile(ttsUrl, path);
		
		return api.sendMessage({ 
            attachment: createReadStream(path)
        }, event.threadID, () => {
            if (require('fs-extra').existsSync(path)) unlinkSync(path);
        }, event.messageID);

	} catch (e) { 
        console.log(e);
        return api.sendMessage("حدث خطأ في جلب الصوت، تأكد من اتصال السيرفر.", event.threadID);
    }
};
