const { GuildScheduledEventStatus } = require('discord.js');
const store = require('./store');
const { isSameUtcDay } = require('./dates');

// Flights currently eligible to appear on a guild's board: not cancelled or
// completed, and scheduled for today (UTC). Shared by the board renderer and
// by the /cancel and /delay commands so a flight is only ever actionable if
// it's actually the one being shown.
function getTodaysActiveEvents(guildId, now = new Date()) {
  return store
    .getEventsByGuild(guildId)
    .filter((e) => e.status !== GuildScheduledEventStatus.Canceled && e.status !== GuildScheduledEventStatus.Completed)
    .filter((e) => e.scheduledStart && isSameUtcDay(new Date(e.scheduledStart), now))
    .sort((a, b) => new Date(a.scheduledStart) - new Date(b.scheduledStart));
}

module.exports = { getTodaysActiveEvents };
