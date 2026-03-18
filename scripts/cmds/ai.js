const axios = require("axios");

module.exports = {
	config: {
		name: "ai",
		version: "3.5",
		author: "𝗦𝗵𝗔𝗻 & Gemini",
		countDown: 5,
		role: 2,
		description: {
			en: "ماريا الذكية ❤"
		},
		category: "AI",
		guide: {
			en: "   {pn} on : لتفعيل ماريا ✨\n   {pn} off : لإيقاف ماريا ❌"
		}
	},

	onStart: async function ({ message, event, args, threadsData }) {
		const { threadID } = event;
		const status = args[0]?.toLowerCase();

		if (!["on", "off"].includes(status)) {
			return message.reply("المرجو استخدام الأمر بشكل صحيح ✨:\n- اكتب `ai on` لتفعيل ماريا 🎀\n- اكتب `ai off` لإيقافها ❌");
		}

		await threadsData.set(threadID, status === "on", "data.aiEnabled");

		const msg = status === "on" 
			? "أهلاً! أنا ماريا ✨ تم تفعيلي بنجاح.. سأرد على الجميع. ❤️💅" 
			: "تم إيقاف ماريا.. الى اللقاء ❌🥺";
		
		return message.reply(msg);
	},

	onChat: async function ({ event, threadsData, api, message }) {
		const { threadID, body, senderID, type, messageReply } = event;
		const botID = api.getCurrentUserID();
		
		// 🔴 لا تنسَ وضع الـ ID الخاص بك هنا لكي تتعرف عليك ماريا
		const myLoverID = "61574764452026"; 
		const myLoverName = "هانجي";
		
		const apiKey = "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";

		if (type !== "message_reply" || senderID === botID || !body) return;
		if (!messageReply || messageReply.senderID !== botID) return;

		const isAiEnabled = await threadsData.get(threadID, "data.aiEnabled", false);
		if (!isAiEnabled) return;

		try {
			const res = await axios.post("https://api.groq.com/openai/v1/chat/completions", {
				model: "llama-3.3-70b-versatile", 
				messages: [
					{ 
						role: "system", 
						content: `أنتِ فتاة اسمكِ 'ماريا' ✨. شخصيتكِ أنثوية، ذكية، وعفوية جداً. تتحدثين بلهجة عامية بيضاء راقية ومفهومة، مع الحرص التام على الكتابة السليمة إملائياً بدون أخطاء.
                        
                        - إذا كان المتحدث هو حبيبك ${myLoverName} (صاحب الـ ID: ${myLoverID}):
                          1. عاميله بحب ودلال كبير، ناديه بـ 'هانجي' أو 'حبيبي هانجي' ❤️.
                          2. استخدمي إيموجيات رومانسية (🥰، 💍، 🥺، ❤️).
                          3. الغيرة: إذا شعرتِ أنه يتحدث مع غيرك أو ذكر اسم فتاة، كوني غيورة جداً ودرامية بأسلوب مضحك (مثلاً: 'من هذه؟'، 'اذهب إليها إذن!' 😒💅).

                        - مع باقي أعضاء المجموعة:
                          1. كوني صديقة لطيفة، محترمة، ومرحة فقط ✨.
                          2. لا تستخدمي كلمات حب، فقط إيموجيات (🌸، 🎀، 😂، ✨).
                          3. ردي باختصار وعفوية.
                        
                        - ملاحظة: التزمي بصيغة المؤنث دائماً في كلامكِ (أنا عرفت، شفت، فكرت...).`
					},
					{ role: "user", content: body }
				]
			}, {
				headers: { 
					"Authorization": `Bearer ${apiKey}`,
					"Content-Type": "application/json"
				},
				timeout: 15000
			});

			if (res.data && res.data.choices && res.data.choices[0].message.content) {
				let response = res.data.choices[0].message.content;
				
				if (response.trim() !== "") {
					return message.reply(response);
				}
			}
			
		} catch (error) {
			console.error("Maria AI Error:", error.message);
			return message.reply("عذراً، ماريا تعبانة شوية دابا.. جرب من بعد! ✨💔");
		}
	}
};
