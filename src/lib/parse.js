const ROUTE_SEPARATORS = [/→/, /->/, /\bto\b/i, /-/];

function parseRoute(location) {
  if (!location) return { origin: 'Unknown', destination: 'Unknown' };
  for (const sep of ROUTE_SEPARATORS) {
    if (sep.test(location)) {
      const parts = location
        .split(sep)
        .map((s) => s.trim())
        .filter(Boolean);
      if (parts.length >= 2) {
        return { origin: parts[0], destination: parts[1] };
      }
    }
  }
  return { origin: location.trim(), destination: 'Unknown' };
}

function toRecord(discordEvent) {
  const location = discordEvent.entityMetadata?.location || null;
  const { origin, destination } = parseRoute(location);
  return {
    id: discordEvent.id,
    guildId: discordEvent.guildId,
    flightNumber: discordEvent.name,
    origin,
    destination,
    aircraft: discordEvent.description?.trim() || 'Unknown',
    scheduledStart: discordEvent.scheduledStartAt ? discordEvent.scheduledStartAt.toISOString() : null,
    status: discordEvent.status,
    creatorTag: discordEvent.creator?.username || 'Unknown',
  };
}

module.exports = { parseRoute, toRecord };
