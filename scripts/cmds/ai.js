const axios = require("axios");

module.exports = {
	config: {
		name: "ai",
		version: "2.2",
		author: "Gemini",
		countDown: 5,
		role: 2,
		description: { en: "AI Chat with Gemini" },
		category: "AI",
		guide: { en: "{pn} on | off" }
	},

	onStart: async function ({ message, event, args, threadsData }) {
		const { threadID } = event;
		const status = args[0]?.toLowerCase();
		if (!["on", "off"].includes(status)) return message.reply("استخدم: ai on أو ai off");
		await threadsData.set(threadID, status === "on", "data.aiEnabled");
		return message.reply(status === "on" ? "تم التفعيل بنجاح ✅" : "تم الإيقاف ❌");
	},

	onChat: async function ({ api, event, threadsData, message }) {
		const { threadID, body, senderID, messageReply } = event;
		const botID = api.getCurrentUserID();

		if (senderID === botID || !body) return;

		const isAiEnabled = await threadsData.get(threadID, "data.aiEnabled", false);
		if (!isAiEnabled) return;

		// الرد فقط عند عمل Reply لرسالة البوت
		if (!messageReply || messageReply.senderID !== botID) return;

		const GEMINI_API_KEY = "AIzaSyCJ4oQAoLCdcAx9kN-qd9FQaKzK-Y2Fd6o"; 

		try {
			// تم إزالة sendTypingIndicator لتجنب خطأ 404 الظاهر في الصورة
			
			const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`;

			const res = await axios.post(url, {
				contents: [{ parts: [{ text: `أنت بوت فكاهي ومشاكس، رد باختصار وبلهجة مغربية مضحكة على: ${body}` }] }]
			}, {
                headers: { 'Content-Type': 'application/json' }
            });

			if (res.data && res.data.candidates && res.data.candidates[0].content) {
				const response = res.data.candidates[0].content.parts[0].text;
				return message.reply(response);
			}
		} catch (error) {
			console.error("Gemini Error:", error.message);
			// إذا استمر خطأ 404 في Gemini، قد تحتاج للتأكد من تفعيل "Generative Language API" في Google Cloud
		}
	}
};
