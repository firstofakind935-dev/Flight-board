const { Events } = require('discord.js');
const store = require('../lib/store');
const { flightEmbed } = require('../lib/embeds');

module.exports = {
  name: Events.InteractionCreate,
  async execute(client, interaction) {
    if (interaction.isAutocomplete()) {
      const command = client.commands.get(interaction.commandName);
      if (!command?.autocomplete) return;
      try {
        await command.autocomplete(interaction);
      } catch (err) {
        console.error(err);
      }
      return;
    }

    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      try {
        await command.execute(interaction);
      } catch (err) {
        console.error(err);
        const payload = { content: 'Something went wrong running that command.', ephemeral: true };
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply(payload).catch(() => {});
        } else {
          await interaction.reply(payload).catch(() => {});
        }
      }
      return;
    }

    if (interaction.isStringSelectMenu() && interaction.customId === 'flight_board_select') {
      const record = store.getEventById(interaction.values[0]);
      if (!record || record.guildId !== interaction.guildId) {
        await interaction.reply({ content: 'That flight is no longer available.', ephemeral: true });
        return;
      }
      await interaction.reply({ embeds: [flightEmbed(record)], ephemeral: true });
    }
  },
};
