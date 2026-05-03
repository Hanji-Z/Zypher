const { createCanvas } = require("canvas");
const fs = require("fs-extra");
const os = require("os");

module.exports = {
  config: {
    name: "uptime",
    aliases: ["up", "upt"],
    version: "4.1.0",
    author: "Hanji",
    role: 0,
    category: "system",
    shortDescription: { en: "Zypher system dashboard" }
  },

  onStart: async function ({ api, event, usersData, threadsData }) {
    const { threadID, messageID } = event;

    try {
      const allUsers  = (await usersData.getAll())  || [];
      const allThreads = (await threadsData.getAll()) || [];
      const uptime = process.uptime();

      const days    = Math.floor(uptime / 86400);
      const hours   = Math.floor((uptime % 86400) / 3600);
      const minutes = Math.floor((uptime % 3600) / 60);
      const seconds = Math.floor(uptime % 60);
      const uptimeStr = days > 0
        ? `${days}d ${hours}h ${minutes}m`
        : `${hours}h ${minutes}m ${seconds}s`;

      const mem       = process.memoryUsage();
      const ramUsed   = (mem.heapUsed / 1024 / 1024).toFixed(1);
      const ramTotal  = (mem.heapTotal / 1024 / 1024).toFixed(1);
      const ramPct    = Math.min(100, Math.round((mem.heapUsed / mem.heapTotal) * 100));

      const totalRamMB = Math.round(os.totalmem() / 1024 / 1024);
      const freeRamMB  = Math.round(os.freemem() / 1024 / 1024);
      const usedRamMB  = totalRamMB - freeRamMB;
      const sysRamPct  = Math.min(100, Math.round((usedRamMB / totalRamMB) * 100));

      const prefix       = global.GoatBot?.config?.prefix || ".";
      const totalCmds    = global.GoatBot?.commands?.size || 0;

      const W = 820, H = 520;
      const canvas = createCanvas(W, H);
      const ctx = canvas.getContext("2d");

      // Background
      ctx.fillStyle = "#0d1117";
      ctx.fillRect(0, 0, W, H);

      // Border
      ctx.strokeStyle = "#30363d";
      ctx.lineWidth = 4;
      ctx.strokeRect(10, 10, W - 20, H - 20);

      // Helpers
      const roundRect = (x, y, w, h, r, fill) => {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, x + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
        ctx.fillStyle = fill;
        ctx.fill();
      };

      // Header
      roundRect(20, 20, W - 40, 80, 12, "#161b22");
      
      // Text - زدت Arial و Impact حيت كيكونو ديما فـ السيرفرات
      ctx.fillStyle = "#00d4ff";
      ctx.font = "bold 35px Arial, sans-serif";
      ctx.fillText("𝗭𝗬𝗣𝗛𝗘𝗥 𝗦𝗬𝗦𝗧𝗘𝗠", 130, 70);

      // Stat Cards
      const cards = [
        { l: "Uptime", v: uptimeStr, c: "#00d4ff" },
        { l: "Users", v: allUsers.length.toString(), c: "#a78bfa" },
        { l: "Groups", v: allThreads.length.toString(), c: "#34d399" },
        { l: "RAM Pct", v: `${ramPct}%`, c: "#fbbf24" }
      ];

      cards.forEach((card, i) => {
        const x = 30 + (i * 190);
        roundRect(x, 130, 180, 100, 10, "#1c2128");
        ctx.fillStyle = card.c;
        ctx.font = "15px Arial";
        ctx.fillText(card.l, x + 15, 160);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 22px Arial";
        ctx.fillText(card.v, x + 15, 200);
      });

      // RAM Progress Bars
      ctx.fillStyle = "#8b949e";
      ctx.font = "bold 16px Arial";
      ctx.fillText("MEMORY USAGE (HEAP)", 40, 280);
      
      // Gray bar
      roundRect(40, 300, W - 80, 20, 10, "#30363d");
      // Green bar
      roundRect(40, 300, (W - 80) * (ramPct / 100), 20, 10, "#34d399");

      // Footer
      ctx.fillStyle = "#484f58";
      ctx.font = "14px Arial";
      ctx.fillText(`Owner: Hanji | Platform: ${os.platform()} | Node: ${process.version}`, 40, H - 40);

      // ── Send as Buffer (The Fix) ──
      const imageBuffer = canvas.toBuffer("image/png");

      return api.sendMessage({
        body: "📊 لوحة تحكم نظام زيفر جاهزة:",
        attachment: imageBuffer
      }, threadID, messageID);

    } catch (err) {
      console.error(err);
      return api.sendMessage(`❌ Error: ${err.message}`, threadID, messageID);
    }
  }
};
