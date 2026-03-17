const axios = require("axios");

module.exports = {
	config: {
		name: "ai",
		version: "2.6",
		author: "𝗦𝗵𝗔𝗻 & Gemini",
		countDown: 5,
		role: 2,
		description: {
			en: "الرد الذكي عبر Groq (يعمل عند الرد على البوت)"
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
			return message.reply("المرجو استخدام الأمر بشكل صحيح:\n- اكتب `ai on` لتفعيل البوت.\n- اكتب `ai off` لإيقافه.");
		}

		// تخزين الحالة في threadsData
		await threadsData.set(threadID, status === "on", "data.aiEnabled");
		
		api.setMessageReaction(status === "on" ? "⏳" : "✅", messageID, () => {}, true);

		const msg = status === "on" 
			? "تم تفعيل الذكاء الاصطناعي بنجاح ✅\nالآن سأقوم بالرد على أي شخص يقتبس (Reply) رسائلي." 
			: "تم إيقاف الذكاء الاصطناعي ❌";
		
		return message.reply(msg);
	},

	// تم التغيير إلى onChat لأنها المسؤولة عن قراءة نصوص الدردشة والردود
	onChat: async function ({ event, threadsData, api, message }) {
		const { threadID, messageID, body, senderID, type, messageReply } = event;
		const botID = api.getCurrentUserID();
		const apiKey = "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";

		// 1. الحماية: التأكد أن الرسالة عبارة عن Reply، وليست من البوت نفسه، وتحتوي على نص
		if (type !== "message_reply" || senderID === botID || !body) return;

		// 2. التأكد أن الرد موجه لرسالة البوت حصراً
		if (!messageReply || messageReply.senderID !== botID) return;

		// 3. التحقق من تفعيل الميزة في المجموعة
		const isAiEnabled = await threadsData.get(threadID, "data.aiEnabled", false);
		if (!isAiEnabled) return;

		try {
			api.setMessageReaction("⏳", messageID, () => {}, true);

			const res = await axios.post("https://api.groq.com/openai/v1/chat/completions", {
				model: "llama3-70b-8192",
				messages: [
					{ 
						role: "system", 
                        // تم تعديل التوجيه ليكون طبيعياً ومرحاً كصديق
                        content: "أنت مساعد ذكي ومرح. تحدث بلهجة عربية طبيعية جداً، وتصرف كصديق في جروب دردشة. إجاباتك يجب أن تكون مختصرة، عفوية، وبعيدة عن الرسمية المبالغ فيها. يمكنك فهم الدارجة المغربية والرد بأسلوب لطيف." 
					},
					{ role: "user", content: body }
				]
			}, {
				headers: { 
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json"
                }
			});

			let response = res.data.choices[0].message.content;

			// 🛡️ منع خطأ الرسالة الفارغة
			if (response && response.trim() !== "") {
				api.setMessageReaction("✅", messageID, () => {}, true);
				return message.reply(response);
			}
		} catch (error) {
			console.error("AI Chat Error:", error);
			api.setMessageReaction("❌", messageID, () => {}, true);
		}
	}
};
