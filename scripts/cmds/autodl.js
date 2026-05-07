const axios = require("axios");

const dApi = async () => {
  const base = await axios.get(
    "https://raw.githubusercontent.com/Sh4nDev/ShAn.s-Api/refs/heads/main/Api.json"
  );
  return base.data.shan;
};

module.exports.config = {
  name: "autodl",
  version: "1.7.0",
  author: "Hanji",
  role: 0,
  description: "Automatically download videos from supported platforms without self-looping!",
  category: "𝗠𝗘𝗗𝗜𝗔",
  countDown: 10,
  guide: {
    en: "Just send a link from TikTok, FB, YT, etc., and the bot will handle it.",
  },
};

const platforms = {
  TikTok: {
    regex: /(?:https?:\/\/)?(?:www\.)?tiktok\.com/,
    endpoint: "/ShAn-tikDL?url=",
  },
  Facebook: {
    regex: /(?:https?:\/\/)?(?:www\.)?(facebook\.com|fb\.watch|facebook\.com\/share\/v)/,
    endpoint: "/ShAn-fbDL?url=",
  },
  YouTube: {
    regex: /(?:https?:\/\/)?(?:www\.)?(youtube\.com|youtu\.be)/,
    endpoint: "/ShAn-ytDL?url=",
  },
  Twitter: {
    regex: /(?:https?:\/\/)?(?:www\.)?x\.com/,
    endpoint: "/ShAn-alldl?url=",
  },
  Instagram: {
    regex: /(?:https?:\/\/)?(?:www\.)?instagram\.com/,
    endpoint: "/ShAn-instaDL?url=",
  },
};

const detectPlatform = (url) => {
  for (const [platform, data] of Object.entries(platforms)) {
    if (data.regex.test(url)) {
      return { platform, endpoint: data.endpoint };
    }
  }
  return null;
};

const downloadVideo = async (apiUrl, url) => {
  const match = detectPlatform(url);
  if (!match) {
    throw new Error("No matching platform found.");
  }

  const { platform, endpoint } = match;
  const endpointUrl = `${apiUrl}${endpoint}${encodeURIComponent(url)}`;

  try {
    const res = await axios.get(endpointUrl);
    const videoUrl = res.data?.videoUrl;
    if (videoUrl) {
      return { 
        downloadUrl: videoUrl, 
        platform: res.data.platform || platform 
      };
    }
  } catch (error) {
    throw new Error("API retrieval failed.");
  }
  throw new Error("Video URL not found in response.");
};

module.exports.onStart = ({}) => {};

module.exports.onChat = async ({ api, event }) => {
  const { body, threadID, messageID, senderID } = event;
  const botID = api.getCurrentUserID();

  // 🛡️ منع البوت من قراءة روابطه الخاصة (Anti-Loop)
  if (senderID === botID || !body) return;

  const urlMatch = body.match(/https?:\/\/[^\s]+/);
  if (!urlMatch) return;
  
  const url = urlMatch[0];
  const platformMatch = detectPlatform(url);
  if (!platformMatch) return;

  try {
    const apiUrl = await dApi();
    const { downloadUrl, platform } = await downloadVideo(apiUrl, url);

    const videoStream = await axios.get(downloadUrl, { responseType: "stream" });
    
    // 📝 الرسالة النهائية مع لمسة هانجي
    api.sendMessage(
      {
        body: `✅ Successfully downloaded!\n🔖 Platform: ${platform}\nby hanji`,
        attachment: [videoStream.data],
      },
      threadID,
      messageID
    );
  } catch (error) {
    console.error(`❌ AutoDL Error:`, error.message);
  }
};
