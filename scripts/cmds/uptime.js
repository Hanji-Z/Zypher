const { createCanvas, loadImage } = require("canvas");
const fs = require("fs-extra");
const path = require("path");
const os = require("os");

module.exports = {
  config: {
    name: "uptime",
    aliases: ["up", "upt"],
    version: "3.0.1",
    author: "Hanji",
    role: 2,
    category: "system",
    shortDescription: { en: "Display Ultimate Hacker Stats on a Terminal Card" }
  },

  onStart: async function ({ api, event, usersData, threadsData }) {
    const { threadID, messageID, senderID } = event;

    try {
      // 1️⃣ جـمـع الـبـيـانـات (دقة دقة)
      const allUsers = await usersData.getAll();
      const allThreads = await threadsData.getAll();
      const uptime = process.uptime();
      
      const days = Math.floor(uptime / 86400);
      const hours = Math.floor((uptime % 86400) / 3600);
      const minutes = Math.floor((uptime % 3600) / 60);
      const seconds = Math.floor(uptime % 60);
      const uptimeStr = `${days}d ${hours}h ${minutes}m ${seconds}s`;

      // حساب الـ RAM و OS و Version و Ping
      const ramUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
      const ramPercent = (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal * 100).toFixed(0);
      const nodeVersion = process.version;
      const osPlatform = os.platform() + " " + os.arch();
      const prefix = global.config.PREFIX;
      
      // Ping حساب سرعة الاستجابة (بسيطة)
      const startTime = Date.now();
      await new Promise(resolve => setTimeout(resolve, 50)); // محاكاة الانتظار
      const ping = Date.now() - startTime;
      const pingStatus = ping < 150 ? "غزال" : "تـقـيـل";

      // 2️⃣ رسـم الـبـطـاقـة (Canvas)
      const width = 800;
      const height = 450;
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext("2d");

      // الـخـلـفـية (Terminal Black)
      ctx.fillStyle = "#0f0c29"; 
      ctx.fillRect(0, 0, width, height);

      // بـرواز الـجـريـد (Terminal Grid)
      ctx.strokeStyle = "rgba(0, 210, 255, 0.2)";
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke(); }
      for (let y = 0; y < height; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke(); }

      // تـزيـيـن (بـرواز النيون)
      ctx.strokeStyle = "#00ffcc";
      ctx.lineWidth = 10;
      ctx.strokeRect(20, 20, width - 40, height - 40);

      // الـعـنـوان (Hacker Style)
      ctx.font = "bold 50px Arial";
      ctx.fillStyle = "#ffffff";
      ctx.shadowBlur = 15;
      ctx.shadowColor = "#00ffcc";
      ctx.fillText("[ 𝗭𝗬𝗣𝗛𝗘𝗥 𝗦𝗬𝗦𝗧𝗘𝗠 ]", 180, 80);
      ctx.shadowBlur = 0; 
      
      ctx.font = "italic 20px Arial";
      ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
      ctx.fillText(">>> DASHBOARD - HANJI DEV - v3.0 <<<", 240, 110);

      // خـط فـاصـل
      ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
      ctx.fillRect(50, 120, 700, 2);

      // 3️⃣ رسـم الـمـعـلـومـات (Grid Style)
      ctx.font = "24px Arial";
      
      const drawStat = (label, value, x, y, color = "#00ffcc") => {
        ctx.fillStyle = color;
        ctx.fillText(label, x, y);
        ctx.fillStyle = "#ffffff";
        ctx.fillText(value, x, y + 30);
      };

      // Column 1 (System)
      drawStat("OS Platform:", osPlatform, 80, 160, "rgba(255,255,255,0.7)");
      drawStat("Node.js:", nodeVersion, 80, 230, "rgba(255,255,255,0.7)");
      drawStat("Prefix:", `[ **.${prefix}** ]`, 80, 300);
      drawStat("Ping:", `${ping}ms (${pingStatus})`, 80, 370, ping < 150 ? "#00ffcc" : "#ffcc00");

      // Column 2 (Live Metrics)
      drawStat("RAM Usage:", `${ramUsage} MB (${ramPercent}%)`, 450, 160);
      drawStat("Total Users:", allUsers.length.toString(), 450, 230, "rgba(255,255,255,0.7)");
      drawStat("Total Groups:", allThreads.length.toString(), 450, 300);
      drawStat("Uptime (لهربة):", `[ ${uptimeStr} ]`, 450, 370);

      // تـوقـيـع الـمـطـور (هانجي)
      ctx.font = "italic 18px Arial";
      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.fillText("Developer: Hanji | Zypher Project", 500, 420);

      // 4️⃣ تـحـويـل الـصـورة وإرسـالـهـا
      const cachePath = path.join(__dirname, "cache", `uptime_${threadID}.png`);
      if (!fs.existsSync(path.join(__dirname, "cache"))) fs.ensureDirSync(path.join(__dirname, "cache"));
      
      const buffer = canvas.toBuffer("image/png");
      fs.writeFileSync(cachePath, buffer);

      return api.sendMessage({
        body: "📊 [ 𝗭𝗬𝗣𝗛𝗘𝗥 𝗦𝗬𝗦𝗧𝗘𝗠 - 𝗗𝗔𝗦𝗛𝗕𝗢𝗔𝗥𝗗 ]",
        attachment: fs.createReadStream(cachePath)
      }, threadID, () => fs.unlinkSync(cachePath), messageID);

    } catch (error) {
      console.error(error);
      api.sendMessage("❌ Error rendering the terminal dashboard.", threadID, messageID);
    }
  }
};
