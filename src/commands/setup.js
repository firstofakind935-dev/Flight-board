const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const store = require('../lib/store');
const { refreshBoard } = require('../lib/board');

const REQUIRED_PERMISSIONS = {
  ViewChannel: 'View Channel',
  SendMessages: 'Send Messages',
  EmbedLinks: 'Embed Links',
  ReadMessageHistory: 'Read Message History',
};

// Turns a Discord API error into something a server admin can act on.
function explainError(err) {
  if (err?.code === 50001 || err?.code === 50013) {
    return "the bot is missing permissions in this channel. Check the channel's permission overrides for the bot's role.";
  }
  if (err?.code === 50035) {
    return 'Discord rejected the board message. If `BOARD_IMAGE_URL` is set, make sure it is a direct `https://` link to an image.';
  }
  return `${err?.message || err} (see the bot's console for details).`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Post the flight board in this channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const channel = interaction.channel ?? (await interaction.client.channels.fetch(interaction.channelId).catch(() => null));
    if (!channel?.isTextBased()) {
      await interaction.editReply("⚠️ I can't post in this channel. Run `/setup` in a normal text channel the bot can see.");
      return;
    }

    const me = interaction.guild.members.me ?? (await interaction.guild.members.fetchMe());
    const perms = channel.permissionsFor(me);
    const missing = Object.entries(REQUIRED_PERMISSIONS)
      .filter(([flag]) => !perms?.has(PermissionFlagsBits[flag]))
      .map(([, label]) => label);
    if (missing.length) {
      await interaction.editReply(`⚠️ The bot is missing these permissions in ${channel}: **${missing.join(', ')}**. Give its role those permissions here, then run \`/setup\` again.`);
      return;
    }

    store.setBoard(interaction.guildId, channel.id, null);
    try {
      await refreshBoard(interaction.client, interaction.guildId);
    } catch (err) {
      console.error('Failed to post board:', err);
      await interaction.editReply(`⚠️ Couldn't post the board: ${explainError(err)}`);
      return;
    }
    await interaction.editReply('✅ Flight board set up in this channel. New flights will be posted here.');
  },
};
