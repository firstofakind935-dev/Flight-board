const { Events } = require('discord.js');
const store = require('../lib/store');
const { toRecord } = require('../lib/parse');
const { refreshBoard } = require('../lib/board');
const { startDailyRefresh } = require('../lib/scheduler');

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    for (const guild of client.guilds.cache.values()) {
      const discordEvents = await guild.scheduledEvents.fetch().catch(() => null);
      if (discordEvents) {
        for (const discordEvent of discordEvents.values()) {
          const record = toRecord(discordEvent);
          const existing = store.getEventById(record.id);
          record.originalScheduledStart = existing?.originalScheduledStart || existing?.scheduledStart || record.scheduledStart;
          store.upsertEvent(record);
        }
      }
      await refreshBoard(client, guild.id);
    }
    startDailyRefresh(client);
    console.log(`Logged in as ${client.user.tag}`);
  },
};
