const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getTodaysActiveEvents } = require('../lib/flights');
const { delayFlight } = require('../lib/actions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('delay')
    .setDescription("Delay a flight on today's board")
    .addStringOption((opt) =>
      opt.setName('flight').setDescription('Flight to delay').setRequired(true).setAutocomplete(true),
    )
    .addIntegerOption((opt) =>
      opt
        .setName('minutes')
        .setDescription('How many minutes to push the departure back by')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(1440),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents)
    .setDMPermission(false),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused().toLowerCase();
    const choices = getTodaysActiveEvents(interaction.guildId)
      .filter((e) => e.flightNumber.toLowerCase().includes(focused))
      .slice(0, 25)
      .map((e) => ({ name: `${e.flightNumber} — ${e.origin} to ${e.destination}`, value: e.id }));
    await interaction.respond(choices);
  },

  async execute(interaction) {
    const eventId = interaction.options.getString('flight', true);
    const minutes = interaction.options.getInteger('minutes', true);
    const target = getTodaysActiveEvents(interaction.guildId).find((e) => e.id === eventId);
    if (!target) {
      await interaction.reply({ content: "Couldn't find that flight on today's board — it may already be gone.", ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });
    const result = await delayFlight(interaction.guild, target, minutes);
    await interaction.editReply(result.message);
  },
};
