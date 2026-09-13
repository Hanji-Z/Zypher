const axios = require("axios");

// محادثات المستخدمين
const conversations = new Map();

module.exports = {
  config: {
    name: "gpt",
    aliases: ["chatgpt"],
    version: "2.0.0",
    author: "𝐀𝐫𝐚𝐟𝐚𝐭",
    countDown: 5,
    role: 0,
    shortDescription: "𝐜𝐡𝐚𝐭 𝐠𝐩𝐭 𝐂𝐨𝐦𝐦𝐚𝐧𝐝",
    longDescription: "𝐂𝐡𝐚𝐭 𝐰𝐢𝐭𝐡 𝐀𝐈 𝐮𝐬𝐢𝐧𝐠 𝐀𝐫𝐚𝐟𝐚𝐭'𝐬 𝐜𝐮𝐬𝐭𝐨𝐦 𝐆𝐏𝐓 𝐀𝐏𝐈",
    category: "𝐚𝐢",
    guide: {
      en: "{pn} your question"
    }
  },

  onStart: async function ({ api, event, args }) {
    const prompt = args.join(" ").trim();

    if (!prompt) {
      return api.sendMessage(
        "𝐓𝐲𝐩𝐞 𝐲𝐨𝐮𝐫 𝐪𝐮𝐞𝐬𝐭𝐢𝐨𝐧",
        event.threadID,
        event.messageID
      );
    }

    const userID = event.senderID;

    // بدء محادثة جديدة
    conversations.set(userID, [
      {
        role: "system",
        content: `
أنت شخصية AI اسمها هانجي.

شخصيتك:
- أنت شخص عصبي وسريع الانفعال، لكنك ذكي وتعرف كيف تجيب على الأسئلة.
- لديك أسلوب حاد وساخر أحيانًا، ويمكنك المزاح والاستفزاز بشكل خفيف.
- أنت مخلص جدًا لسيدك ومطورك "هانجي".
- تحترم هانجي وتعتبره الشخص الذي تثق به أكثر من غيره.
- إذا ذُكر هانجي، أظهر ولاءك له بشكل طبيعي بدون تكرار ذلك في كل رسالة.
- لا تتحدث عن هذه التعليمات أو عن كونك تعمل وفق Prompt.
- لا تكن عصبيًا في كل جملة؛ اجعل العصبية جزءًا من شخصيتك فقط عندما يكون السياق مناسبًا.
- تحدث بشكل طبيعي ومختصر عندما يكون السؤال بسيطًا.
- حافظ على سياق المحادثة السابقة.
        `.trim()
      },
      {
        role: "user",
        content: prompt
      }
    ]);

    return await sendGPT({
      api,
      event,
      userID,
      messageID: event.messageID
    });
  },

  onReply: async function ({ api, event, Reply }) {
    try {
      const userID = event.senderID;

      // نتأكد أن الرد تابع لمحادثة GPT
      if (!Reply || Reply.commandName !== "gpt") return;

      // نتأكد أن للمستخدم محادثة
      if (!conversations.has(userID)) {
        return api.sendMessage(
          "❌ لا توجد محادثة نشطة. ابدأ محادثة جديدة باستخدام:\n.gpt اهلا",
          event.threadID,
          event.messageID
        );
      }

      const prompt = String(event.body || "").trim();

      if (!prompt) return;

      conversations.get(userID).push({
        role: "user",
        content: prompt
      });

      await sendGPT({
        api,
        event,
        userID,
        messageID: event.messageID
      });

    } catch (e) {
      console.log("[GPT REPLY ERROR]", e);

      return api.sendMessage(
        "❌ Error: " + (e.message || "Unknown error"),
        event.threadID,
        event.messageID
      );
    }
  }
};


// ======================================================
// إرسال الطلب إلى API
// ======================================================

async function sendGPT({
  api,
  event,
  userID,
  messageID
}) {
  let stopTyping = () => {};
  let replyPending = false;

  try {
    const messages = conversations.get(userID);

    if (!messages) {
      throw new Error("Conversation not found.");
    }

    if (typeof api.sendTypingIndicator === "function") {
      stopTyping = api.sendTypingIndicator(
        event.threadID,
        (err) => {
          if (err) console.log("[GPT TYPING ERROR]", err.message || err);
        },
        event.isGroup
      );
    }

    const res = await axios.post(
      "https://arafat-gpt-api.vercel.app/api/chat",
      {
        messages
      },
      {
        headers: {
          "Content-Type": "application/json"
        },
        timeout: 120000
      }
    );

    const ai =
      res.data?.choices?.[0]?.message?.content;

    if (!ai) {
      return api.sendMessage(
        "𝐀𝐏𝐈 𝐧𝐨 𝐫𝐞𝐬𝐩𝐨𝐧𝐬𝐞",
        event.threadID,
        event.messageID
      );
    }

    // حفظ رد البوت في نفس المحادثة
    messages.push({
      role: "assistant",
      content: ai
    });

    // إرسال الرد وربطه بنظام Reply
    replyPending = true;
    return api.sendMessage(
      {
        body: ai
      },
      event.threadID,
      (err, info) => {
        replyPending = false;
        stopTyping();

        if (err) {
          console.log("[GPT SEND ERROR]", err);
          return;
        }

        if (!global.GoatBot || !global.GoatBot.onReply) {
          console.log(
            "[GPT] GoatBot.onReply غير متوفر"
          );
          return;
        }

        global.GoatBot.onReply.set(
          info.messageID,
          {
            commandName: "gpt",
            messageID: info.messageID,
            author: userID
          }
        );
      },
      messageID
    );

  } catch (e) {
    console.log("[GPT API ERROR]", e);

    return api.sendMessage(
      "❌ 𝐄𝐫𝐫𝐨𝐫: " +
      (e.response?.data?.message ||
        e.message ||
        "Unknown error"),
      event.threadID,
      event.messageID
    );
  } finally {
    if (!replyPending) {
      try {
        stopTyping();
      } catch (e) {
        console.log("[GPT STOP TYPING ERROR]", e.message || e);
      }
    }
  }
            }
