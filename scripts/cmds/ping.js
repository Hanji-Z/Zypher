module.exports = {
  config: {
    name: "ping",
    aliases: ["p", "بنغ"],
    version: "1.0.0",
    author: "Hanji",
    countDown: 3,
    role: 0,
    category: "system",
    shortDescription: { en: "Check bot response time" },
    guide: { en: "{pn}" }
  },

  onStart: async function ({ message, event }) {
    const receivedAt = Number(event.timestamp);
    const latency = Number.isFinite(receivedAt)
      ? Math.max(0, Date.now() - receivedAt)
      : 0;
    const uptime = Math.floor(process.uptime());
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = uptime % 60;

    return message.reply(
      `🏓 Pong!\n📡 Latency: ${latency}ms\n⏱️ Uptime: ${hours}h ${minutes}m ${seconds}s`
    );
  }
};
