function ordinalSuffix(day) {
  if (day % 10 === 1 && day % 100 !== 11) return 'st';
  if (day % 10 === 2 && day % 100 !== 12) return 'nd';
  if (day % 10 === 3 && day % 100 !== 13) return 'rd';
  return 'th';
}

function formatBoardDate(date) {
  const day = date.getUTCDate();
  const month = date.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });
  return `${day}${ordinalSuffix(day)} ${month}`;
}

// Discord renders this as a short local time (e.g. "9:41 AM"), client-side,
// in each viewer's own timezone — no server-side timezone handling needed.
function discordTimestamp(isoString, style = 't') {
  const unix = Math.floor(new Date(isoString).getTime() / 1000);
  return `<t:${unix}:${style}>`;
}

// Fixed 24h UTC time, e.g. "09:00 UTC" — the same text for every viewer.
function formatUtcTime(isoString) {
  const d = new Date(isoString);
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${hh}:${mm} UTC`;
}

function isSameUtcDay(a, b) {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

module.exports = { formatBoardDate, discordTimestamp, formatUtcTime, isSameUtcDay };
