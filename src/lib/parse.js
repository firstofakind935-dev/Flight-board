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

function extractLabeledLine(description, label) {
  const match = description.match(new RegExp(`${label}\\s*:\\s*(.+)`, 'i'));
  return match ? match[1].trim() : null;
}

// For Stage/Voice events (no Location field), the route and aircraft come
// from labeled lines in the Description instead, e.g.:
//   Departing: Seoul (ICN), South Korea
//   Arriving: Delhi (DEL), India
//   Aircraft: B787-9 Dreamliner
function parseDescriptionFields(description) {
  if (!description) return {};
  return {
    departing: extractLabeledLine(description, 'Departing'),
    arriving: extractLabeledLine(description, 'Arriving'),
    aircraft: extractLabeledLine(description, 'Aircraft'),
  };
}

function toRecord(discordEvent) {
  const location = discordEvent.entityMetadata?.location || null;

  let origin;
  let destination;
  let aircraft;

  if (location) {
    // "Someplace Else" event: Location holds the route, Description is just the aircraft.
    ({ origin, destination } = parseRoute(location));
    aircraft = discordEvent.description?.trim() || 'Unknown';
  } else {
    // Stage/Voice event: route and aircraft come from labeled Description lines.
    const parsed = parseDescriptionFields(discordEvent.description);
    origin = parsed.departing || 'Unknown';
    destination = parsed.arriving || 'Unknown';
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
