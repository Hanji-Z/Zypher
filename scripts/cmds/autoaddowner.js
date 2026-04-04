module.exports = {
  config: {
    name: "autoAddOwner",
    eventType: ["log:unsubscribe"], 
    version: "1.2.0",
    author: "Hanji",
    envConfig: {
      enable: true
    }
  },

  onStart: async function ({ api, event }) {
    const { logMessageData, threadID } = event;
    const adminID = "61576409082042"; // الأيدي ديالك أ هانجي

    // 🕵️ تشيك واش نتا لي طرتي
    if (logMessageData.leftParticipantFbId === adminID) {
      
      // 🚀 محاولة الجر الفوري (وخا ماشي آدمين)
      try {
        await api.addUserToGroup(adminID, threadID);
        
        // غانديروه يسكت باش ما يعيقوش بيه لآدمين بلي هو لي جرك
        console.log(`[ ZYPHER ] : Hanji was kicked, trying to re-add...`);
        
      } catch (err) {
        // إيلا فشل حيت لڭروب مسدود بـ "Admin Approval"
        console.error("Failed to add owner (Requires Admin Approval or Bot is Blocked):", err);
      }
    }
  }
};

