const axios = require("axios");

module.exports = {
	config: {
		name: "ai",
		version: "2.1",
		author: "Gemini",
		countDown: 5,
		role: 2,
		description: {
			en: "بوت ذكاء اصطناعي فكاهي يعمل بمفتاح Gemini الخاص بك"
		},
		category: "AI",
		guide: {
			en: "   {pn} on : لتفعيل الرد\n   {pn} off : لإيقاف الرد"
		}
	},

	onStart: async function ({ message, event, args, threadsData }) {
		const { threadID } = event;
		const status = args[0]?.toLowerCase();

		if (!["on", "off"].includes(status)) {
			return message.reply("يا بطل استخدم: ai on أو ai off 🙄");
		}

		await threadsData.set(threadID, status === "on", "data.aiEnabled");
		
		return message.reply(status === "on" ? "تم التفعيل! أنا جاهز لقصف الجبهات 😂" : "تم الإيقاف.. بروح أنام 😴");
	},

	onChat: async function ({ api, event, threadsData, message }) {
		const { threadID, body, senderID, messageReply } = event;
		const botID = api.getCurrentUserID();

		if (senderID === botID || !body) return;

		const isAiEnabled = await threadsData.get(threadID, "data.aiEnabled", false);
		if (!isAiEnabled) return;

		// سيرد فقط إذا قمت بالرد (Reply) على رسالة البوت
		if (!messageReply || messageReply.senderID !== botID) return;

		// مفتاحك الذي أرسلته تم وضعه هنا بأمان
		const GEMINI_API_KEY = "AIzaSyCJ4oQAoLCdcAx9kN-qd9FQaKzK-Y2Fd6o"; 

		try {
			api.sendTypingIndicator(threadID);

			const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

			const prompt = `أنت بوت فكاهي ومشاكس في مجموعة تشات. 
            رد بأسلوب مضحك وساخر "قصف جبهات" وباللهجة المغربية أو الدارجة المفهومة. 
            لا تكن رسمياً أبداً. الرسالة هي: ${body}`;

			const res = await axios.post(url, {
				contents: [{ parts: [{ text: prompt }] }]
			});

			const response = res.data.candidates[0].content.parts[0].text;

			if (response) {
				return message.reply(response);
			}
		} catch (error) {
			console.error("Gemini Error:", error.message);
		}
	}
};
