const { Events } = require('discord.js');
const store = require('../lib/store');
const { toRecord } = require('../lib/parse');
const { refreshBoard } = require('../lib/board');

module.exports = {
  name: Events.GuildScheduledEventCreate,
  async execute(client, discordEvent) {
    const record = toRecord(discordEvent);
    record.originalScheduledStart = record.scheduledStart;
    store.upsertEvent(record);
    await refreshBoard(client, discordEvent.guildId);
  },
};
