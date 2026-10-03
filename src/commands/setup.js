const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const store = require('../lib/store');
const { refreshBoard } = require('../lib/board');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Post the flight board in this channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    store.setBoard(interaction.guildId, interaction.channel.id, null);
    await refreshBoard(interaction.client, interaction.guildId);
    await interaction.editReply('✅ Flight board set up in this channel. New flights will be posted here.');
  },
};
