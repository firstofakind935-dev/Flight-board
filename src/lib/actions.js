const { GuildScheduledEventEntityType, GuildScheduledEventPrivacyLevel, GuildScheduledEventStatus } = require('discord.js');

const DEFAULT_DURATION_MS = 60 * 60 * 1000;

// Parses "HH:MM" (24h, UTC) plus an optional "YYYY-MM-DD" date (defaults to
// today, UTC) into a Date. Returns null if either part is malformed.
function parseUtcDateTime(time, date, now = new Date()) {
  const t = /^\s*(\d{1,2}):(\d{2})\s*$/.exec(time || '');
  if (!t) return null;
  const hours = Number(t[1]);
  const minutes = Number(t[2]);
  if (hours > 23 || minutes > 59) return null;

  let year = now.getUTCFullYear();
  let month = now.getUTCMonth();
  let day = now.getUTCDate();
  if (date && date.trim()) {
    const d = /^\s*(\d{4})-(\d{2})-(\d{2})\s*$/.exec(date);
    if (!d) return null;
    year = Number(d[1]);
    month = Number(d[2]) - 1;
    day = Number(d[3]);
  }

  const result = new Date(Date.UTC(year, month, day, hours, minutes));
  if (result.getUTCMonth() !== month || result.getUTCDate() !== day) return null;
  return result;
}

// Creates a "Someplace Else" scheduled event using the same field mapping a
// person would use by hand, so the normal event-create handler picks it up
// and puts it on the board. Returns { ok, message }.
async function addFlight(guild, { number, route, time, date, aircraft }) {
  const start = parseUtcDateTime(time, date);
  if (!start) {
    return { ok: false, message: '⚠️ Invalid time/date. Use `HH:MM` in UTC (e.g. `14:30`) and, optionally, a date as `YYYY-MM-DD`.' };
  }
  if (start.getTime() <= Date.now()) {
    return { ok: false, message: '⚠️ That departure time has already passed (times are in UTC). Pick a later time or a future date.' };
  }

  try {
    await guild.scheduledEvents.create({
      name: number.trim().slice(0, 100),
      scheduledStartTime: start,
      scheduledEndTime: new Date(start.getTime() + DEFAULT_DURATION_MS),
      privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly,
      entityType: GuildScheduledEventEntityType.External,
      entityMetadata: { location: route.trim().slice(0, 100) },
      description: aircraft.trim().slice(0, 1000),
    });
    return { ok: true, message: `✅ Added flight ${number.trim()} departing ${route.trim()} at ${time.trim()} UTC.` };
  } catch (err) {
    console.error('Failed to create scheduled event:', err);
    return { ok: false, message: '⚠️ Couldn\'t add the flight — Discord rejected it. Make sure the bot has the "Manage Events" permission.' };
  }
}

async function delayFlight(guild, record, minutes) {
  const newStart = new Date(new Date(record.scheduledStart).getTime() + minutes * 60 * 1000);
  try {
    await guild.scheduledEvents.edit(record.id, { scheduledStartTime: newStart });
    return { ok: true, message: `✅ Delayed flight ${record.flightNumber} by ${minutes} minute${minutes === 1 ? '' : 's'}.` };
  } catch (err) {
    console.error('Failed to delay scheduled event:', err);
    return { ok: false, message: `⚠️ Couldn't delay ${record.flightNumber} — Discord rejected the change. Make sure the bot has the "Manage Events" permission.` };
  }
}

async function cancelFlight(guild, record) {
  try {
    await guild.scheduledEvents.edit(record.id, { status: GuildScheduledEventStatus.Canceled });
    return { ok: true, message: `✅ Cancelled flight ${record.flightNumber}.` };
  } catch (err) {
    console.error('Failed to cancel scheduled event:', err);
    return {
      ok: false,
      message: `⚠️ Couldn't cancel ${record.flightNumber} — Discord rejected the change. Make sure the bot has the "Manage Events" permission, and that the flight hasn't already started.`,
    };
  }
}

module.exports = { parseUtcDateTime, addFlight, delayFlight, cancelFlight };
