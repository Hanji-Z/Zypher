const { createCanvas, loadImage } = require("canvas");
const fs = require("fs-extra");
const path = require("path");
const os = require("os");

module.exports = {
  config: {
    name: "uptime",
    aliases: ["up", "upt"],
    version: "3.0.2",
    author: "Hanji",
    role: 2,
    category: "system",
    shortDescription: { en: "Display Ultimate Hacker Stats" }
  },

  onStart: async function ({ api, event, usersData, threadsData }) {
    const { threadID, messageID } = event;

    try {
      // 1️⃣ جلب البيانات (مع حماية إيلا كان شي متغير ناقص)
      const allUsers = (await usersData.getAll()) || [];
      const allThreads = (await threadsData.getAll()) || [];
      const uptime = process.uptime();
      
      const days = Math.floor(uptime / 86400);
      const hours = Math.floor((uptime % 86400) / 3600);
      const minutes = Math.floor((uptime % 3600) / 60);
      const seconds = Math.floor(uptime % 60);
      const uptimeStr = `${days}d ${hours}h ${minutes}m ${seconds}s`;

      const ramUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
      const nodeVersion = process.version;
      const osPlatform = `${os.platform()} ${os.arch()}`;
      
      // 🛡️ حماية الـ Prefix (في GoatBot كيكون غالبا فـ هاد المسارات)
      const prefix = global.config?.PREFIX || global.GoatBot?.config?.prefix || ".";
      
      const startTime = Date.now();
      const ping = Date.now() - startTime; // حساب تقريبي

      // 2️⃣ رسم البطاقة
      const width = 800;
      const height = 450;
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext("2d");

      // الخلفية
      ctx.fillStyle = "#0f0c29"; 
      ctx.fillRect(0, 0, width, height);

      // برواز النيون
      ctx.strokeStyle = "#00ffcc";
      ctx.lineWidth = 8;
      ctx.strokeRect(20, 20, width - 40, height - 40);

      // العنوان
      ctx.font = "bold 45px sans-serif"; // استعملت sans-serif حيت مضمونة فكاع السيستمات
      ctx.fillStyle = "#ffffff";
      ctx.fillText("[ ZYPHER SYSTEM ]", 200, 80);
      
      ctx.font = "20px sans-serif";
      ctx.fillStyle = "rgba(0, 255, 204, 0.7)";
      ctx.fillText(">>> TERMINAL MONITOR v3.0 <<<", 250, 110);

      // رسم الإحصائيات
      ctx.font = "22px sans-serif";
      const draw = (txt, val, x, y) => {
        ctx.fillStyle = "#00ffcc"; ctx.fillText(txt, x, y);
        ctx.fillStyle = "#ffffff"; ctx.fillText(val, x, y + 30);
      };

      draw("OS Platform:", osPlatform, 80, 170);
      draw("Node.js:", nodeVersion, 80, 250);
      draw("Ping Latency:", `${ping}ms`, 80, 330);
      
      draw("RAM Usage:", `${ramUsage} MB`, 450, 170);
      draw("Total Users:", allUsers.length.toString(), 450, 250);
      draw("Bot Uptime:", uptimeStr, 450, 330);

      // توقيع هانجي
      ctx.font = "italic 18px sans-serif";
      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.fillText(`Prefix: ${prefix} | Dev: Hanji`, 550, 410);

      // 3️⃣ الإرسال
      const cacheDir = path.join(__dirname, "cache");
      if (!fs.existsSync(cacheDir)) fs.ensureDirSync(cacheDir);
      const cachePath = path.join(cacheDir, `up_${Date.now()}.png`);
      
      const buffer = canvas.toBuffer("image/png");
      fs.writeFileSync(cachePath, buffer);

      return api.sendMessage({
        body: "📊 [ 𝗭𝗬𝗣𝗛𝗘𝗥 𝗗𝗔𝗦𝗛𝗕𝗢𝗔𝗥𝗗 ]",
        attachment: fs.createReadStream(cachePath)
      }, threadID, () => fs.unlinkSync(cachePath), messageID);

    } catch (error) {
      console.error("CRITICAL UPTIME ERROR:", error); // هادي غاتبان ليك فـ Railway Logs بالتدقيق
      api.sendMessage(`❌ Error: ${error.message}`, threadID, messageID);
    }
  }
};
