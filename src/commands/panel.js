const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const store = require('../lib/store');
const { refreshPanel } = require('../lib/panel');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('panel')
    .setDescription('Post the staff flight control panel')
    .addChannelOption((opt) =>
      opt
        .setName('channel')
        .setDescription('Channel to post the panel in (defaults to this one)')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    await interaction.deferReply({ ephemeral: true });

    const old = store.getPanel(interaction.guildId);
    if (old?.messageId && old.channelId !== channel.id) {
      const oldChannel = await interaction.client.channels.fetch(old.channelId).catch(() => null);
      await oldChannel?.messages.delete(old.messageId).catch(() => {});
    }

    store.setPanel(interaction.guildId, channel.id, old?.channelId === channel.id ? old.messageId : null);
    try {
      await refreshPanel(interaction.client, interaction.guildId);
    } catch (err) {
      console.error('Failed to post panel:', err);
      await interaction.editReply(`⚠️ Couldn't post the panel in ${channel}. Make sure the bot can view and send messages there.`);
      return;
    }
    await interaction.editReply(`✅ Staff control panel posted in ${channel}.`);
  },
};
