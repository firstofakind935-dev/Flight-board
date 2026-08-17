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

// For Stage/Voice events (no Location field), the route and aircraft are
// both written as labeled lines in the Description instead, e.g.:
//   Route: YYZ to CLE
//   Aircraft: Embraer 175
function parseDescriptionFields(description) {
  if (!description) return { route: null, aircraft: null };
  const routeMatch = description.match(/route\s*:\s*(.+)/i);
  const aircraftMatch = description.match(/aircraft\s*:\s*(.+)/i);
  return {
    route: routeMatch ? routeMatch[1].trim() : null,
    aircraft: aircraftMatch ? aircraftMatch[1].trim() : null,
  };
}

function toRecord(discordEvent) {
  const location = discordEvent.entityMetadata?.location || null;

  let origin;
  let destination;
  let aircraft;

  if (location) {
    // External event: Location holds the route, Description is just the aircraft.
    ({ origin, destination } = parseRoute(location));
    aircraft = discordEvent.description?.trim() || 'Unknown';
  } else {
    // Stage/Voice event: no Location field, so both come from the Description.
    const parsed = parseDescriptionFields(discordEvent.description);
    ({ origin, destination } = parseRoute(parsed.route));
    aircraft = parsed.aircraft || 'Unknown';
  }

  return {
    id: discordEvent.id,
    guildId: discordEvent.guildId,
    flightNumber: discordEvent.name,
    origin,
    destination,
    aircraft,
    scheduledStart: discordEvent.scheduledStartAt ? discordEvent.scheduledStartAt.toISOString() : null,
    status: discordEvent.status,
    creatorTag: discordEvent.creator?.username || 'Unknown',
  };
}

module.exports = { parseRoute, parseDescriptionFields, toRecord };
