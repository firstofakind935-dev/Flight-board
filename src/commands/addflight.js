const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { addFlight } = require('../lib/actions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('addflight')
    .setDescription('Add a flight to the board')
    .addStringOption((opt) => opt.setName('number').setDescription('Flight number, e.g. AI 101').setRequired(true).setMaxLength(100))
    .addStringOption((opt) => opt.setName('route').setDescription('Route, e.g. DEL → JFK or DEL-JFK').setRequired(true).setMaxLength(100))
    .addStringOption((opt) => opt.setName('time').setDescription('Departure time in UTC, 24h HH:MM, e.g. 14:30').setRequired(true))
    .addStringOption((opt) => opt.setName('aircraft').setDescription('Aircraft type, e.g. B777-300ER').setRequired(true).setMaxLength(1000))
    .addStringOption((opt) => opt.setName('date').setDescription('Date as YYYY-MM-DD (UTC). Defaults to today.'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents)
    .setDMPermission(false),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const result = await addFlight(interaction.guild, {
      number: interaction.options.getString('number', true),
      route: interaction.options.getString('route', true),
      time: interaction.options.getString('time', true),
      aircraft: interaction.options.getString('aircraft', true),
      date: interaction.options.getString('date'),
    });
    await interaction.editReply(result.message);
  },
};
