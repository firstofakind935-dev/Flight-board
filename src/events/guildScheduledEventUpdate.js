const { Events } = require('discord.js');
const store = require('../lib/store');
const { toRecord } = require('../lib/parse');
const { refreshBoard } = require('../lib/board');

module.exports = {
  name: Events.GuildScheduledEventUpdate,
  async execute(client, _oldDiscordEvent, newDiscordEvent) {
    const record = toRecord(newDiscordEvent);
    const existing = store.getEventById(record.id);
    record.originalScheduledStart = existing?.originalScheduledStart || existing?.scheduledStart || record.scheduledStart;
    store.upsertEvent(record);
    await refreshBoard(client, newDiscordEvent.guildId);
  },
};
