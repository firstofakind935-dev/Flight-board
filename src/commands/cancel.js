const { SlashCommandBuilder, PermissionFlagsBits, GuildScheduledEventStatus } = require('discord.js');
const { getTodaysActiveEvents } = require('../lib/flights');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cancel')
    .setDescription("Cancel a flight on today's board")
    .addStringOption((opt) =>
      opt.setName('flight').setDescription('Flight to cancel').setRequired(true).setAutocomplete(true),
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
    const target = getTodaysActiveEvents(interaction.guildId).find((e) => e.id === eventId);
    if (!target) {
      await interaction.reply({ content: "Couldn't find that flight on today's board — it may already be gone.", ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });
    try {
      await interaction.guild.scheduledEvents.edit(eventId, { status: GuildScheduledEventStatus.Canceled });
      await interaction.editReply(`✅ Cancelled flight ${target.flightNumber}.`);
    } catch (err) {
      console.error('Failed to cancel scheduled event:', err);
      await interaction.editReply(
        `⚠️ Couldn't cancel ${target.flightNumber} — Discord rejected the change. Make sure the bot has the "Manage Events" permission, and that the flight hasn't already started (in-progress flights can't be cancelled directly).`,
      );
    }
  },
};
