const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const store = require('../lib/store');
const { refreshBoard } = require('../lib/board');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('board')
    .setDescription('Manage the flight board')
    .addSubcommand((sub) => sub.setName('setup').setDescription('Post/move the flight board dropdown to this channel'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),

  async execute(interaction) {
    if (interaction.options.getSubcommand() !== 'setup') return;
    await interaction.deferReply({ ephemeral: true });
    store.setBoard(interaction.guildId, interaction.channel.id, null);
    await refreshBoard(interaction.client, interaction.guildId);
    await interaction.editReply('✅ Flight board set up in this channel. New flight events will be posted here.');
  },
};
