const { Events } = require('discord.js');
const store = require('../lib/store');
const { refreshBoard } = require('../lib/board');

module.exports = {
  name: Events.GuildScheduledEventDelete,
  async execute(client, discordEvent) {
    store.removeEvent(discordEvent.id);
    await refreshBoard(client, discordEvent.guildId);
  },
};
