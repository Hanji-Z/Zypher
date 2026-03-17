const axios = require("axios");

module.exports = {
	config: {
		name: "ai",
		version: "2.8",
		author: "𝗦𝗵𝗔𝗻 & Gemini",
		countDown: 5,
		role: 0,
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

		await threadsData.set(threadID, status === "on", "data.aiEnabled");
		
		api.setMessageReaction(status === "on" ? "⏳" : "✅", messageID, () => {}, true);

		const msg = status === "on" 
			? "تم تفعيل الذكاء الاصطناعي بنجاح ✅\nالآن سأقوم بالرد على أي شخص يقتبس (Reply) رسائلي." 
			: "تم إيقاف الذكاء الاصطناعي ❌";
		
		return message.reply(msg);
	},

	onChat: async function ({ event, threadsData, api, message }) {
		const { threadID, messageID, body, senderID, type, messageReply } = event;
		const botID = api.getCurrentUserID();
		
		// مفتاح الـ API الخاص بك
		const apiKey = "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";

		if (type !== "message_reply" || senderID === botID || !body) return;
		if (!messageReply || messageReply.senderID !== botID) return;

		const isAiEnabled = await threadsData.get(threadID, "data.aiEnabled", false);
		if (!isAiEnabled) return;

		try {
			api.setMessageReaction("⏳", messageID, () => {}, true);

			const res = await axios.post("https://api.groq.com/openai/v1/chat/completions", {
				// 🔴 التغيير الجوهري هنا: استخدام أحدث موديل شغال حالياً
				model: "llama-3.3-70b-versatile", 
				messages: [
					{ 
						role: "system", 
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

			// التأكد من وجود رد فعلي قبل إرساله لمنع خطأ 1545023
			if (res.data && res.data.choices && res.data.choices[0].message.content) {
				let response = res.data.choices[0].message.content;
				
				if (response.trim() !== "") {
					api.setMessageReaction("✅", messageID, () => {}, true);
					return message.reply(response);
				}
			}
			
		} catch (error) {
			console.error("AI Chat Error Details:", error.response ? error.response.data : error.message);
			api.setMessageReaction("❌", messageID, () => {}, true);
			// إرسال رسالة خطأ واضحة داخل الدردشة لتعرف أن هناك مشكلة دون الحاجة للسجلات
			return message.reply("عذراً، سيرفر الذكاء الاصطناعي يواجه مشكلة حالياً ⚠️");
		}
	}
};
