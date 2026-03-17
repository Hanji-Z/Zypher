const axios = require("axios");

module.exports = {
	config: {
		name: "ai",
		version: "1.5",
		author: "Gemini",
		countDown: 5,
		role: 2,
		description: {
			en: "بوت ذكاء اصطناعي فكاهي يرد فقط عند الرد على رسائله"
		},
		category: "AI",
		guide: {
			en: "   {pn} on : لتفعيل الرد الذكي\n   {pn} off : لإيقاف الرد الذكي"
		}
	},

	onStart: async function ({ message, event, args, threadsData, api }) {
		const { threadID, messageID } = event;
		const status = args[0]?.toLowerCase();

		if (!["on", "off"].includes(status)) {
			return message.reply("يا حبيب قلبي استخدم: ai on أو ai off 🙄");
		}

		await threadsData.set(threadID, status === "on", "data.aiEnabled");
		
		const msg = status === "on" 
			? "خلاص فعلت وضع الهبال! 😂 أي حد يرد على رسائلي راح يلقى جواب يطير الجبهة." 
			: "تم الإيقاف.. بروح أنام أحسن لي 😴";
		
		return message.reply(msg);
	},

	onChat: async function ({ api, event, threadsData, message }) {
		const { threadID, messageID, body, senderID, messageReply } = event;
		const botID = api.getCurrentUserID();

		// 1. لا يرد إذا كان هو المرسل أو الرسالة فارغة
		if (senderID === botID || !body) return;

		// 2. التحقق من التفعيل
		const isAiEnabled = await threadsData.get(threadID, "data.aiEnabled", false);
		if (!isAiEnabled) return;

		// 3. الشرط الجوهري: الرد فقط إذا قام المستخدم بعمل "Reply" لرسالة البوت
		if (!messageReply || messageReply.senderID !== botID) return;

		try {
			api.sendTypingIndicator(threadID);

			// إضافة تعليمات للـ API ليكون الرد فكاهياً وساخراً أحياناً
			const funnyPrompt = `رد بأسلوب مضحك وفكاهي جداً، استعمل بعض النكت أو الردود الساخرة "قصف جبهات" باللغة العربية (ويمكنك إضافة بعض الكلمات المغربية للمرح). الرسالة هي: ${body}`;
			
			const res = await axios.get(`https://api.kenliejugar.com/allinoneai/?text=${encodeURIComponent(funnyPrompt)}`);
			let response = res.data.response;

			if (response) {
				// تنظيف الرد من أي مقدمات رسمية مثل "بصفتي ذكاء اصطناعي"
				response = response.replace(/بصفتي ذكاء اصطناعي|كذكاء اصطناعي|عذراً ولكن/g, "اسمعني يا صاحبي");
				
				return message.reply(response);
			}
		} catch (error) {
			console.error("AI Error:", error);
		}
	}
};
