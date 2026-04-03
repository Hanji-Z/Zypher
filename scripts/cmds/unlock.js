heremodule.exports = {
  config: {
    name: "unlock",
    version: "1.0.0",
    author: "Zypher",
    role: 0, // خليه 0 باش تقدر تخدمو ونتا ماشي أدمن
    category: "SYSTEM"
  },

  onStart: async function ({ api, event, threadsData }) {
    const { threadID, senderID } = event;
    const sidebar = "█║ ";
    
    // 🛡️ حماية: غير نتا (المطور) اللي تقدر تخدم هاد الساروت
    // حط الـ ID ديالك فـ بلاصة 1000...
    const adminID = "61576409082042"; // تأكد من الـ ID ديالك هنا أ هانجي

    if (senderID !== adminID) {
      return api.setMessageReaction("🚫", event.messageID, () => {}, true);
    }

    try {
      // فرض إغلاق خاصية OnlyAdminBox
      await threadsData.set(threadID, false, "data.onlyAdminBox");
      
      return api.sendMessage(`[ 𝗭𝗬𝗣𝗛𝗘𝗥 - 𝗨𝗡𝗟𝗢𝗖𝗞 ]\n█║──────────────────\n${sidebar}❯ 𝗦𝗧𝗔𝗧𝗨𝗦: FORCE OFF\n${sidebar}❯ 𝗔𝗖𝗖𝗘𝗦𝗦: GRANTED (Hanji)\n█║──────────────────`, threadID);
    } catch (e) {
      console.error(e);
      return api.sendMessage("Error unlocking thread.", threadID);
    }
  }
};
